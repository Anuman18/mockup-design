import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import sharp from 'sharp';

/**
 * POST /api/generate-visualization
 * Body: FormData with:
 *   - hallId: string (number)
 *   - eventName: string
 *   - eventDate: string
 *   - bannerImage: File
 *
 * Returns: { imageBase64: string, mimeType: 'image/png' }
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const hallId      = formData.get('hallId') as string;
    const eventName   = formData.get('eventName') as string;
    const bannerFile  = formData.get('bannerImage') as File | null;

    // -- 1. Validate inputs ------------------------------------------------
    if (!hallId || isNaN(parseInt(hallId, 10))) {
      return NextResponse.json({ error: 'Valid hallId is required' }, { status: 400 });
    }
    if (!bannerFile || bannerFile.size === 0) {
      return NextResponse.json({ error: 'bannerImage file is required' }, { status: 400 });
    }

    // -- 2. Fetch hall from database ----------------------------------------
    const hall = await prisma.venueHall.findUnique({
      where: { id: parseInt(hallId, 10) },
    });
    if (!hall) {
      return NextResponse.json({ error: 'Hall not found' }, { status: 404 });
    }
    if (!hall.baseImageUrl) {
      return NextResponse.json({ error: 'This hall has no base image configured. Please upload one in Admin.' }, { status: 422 });
    }

    // -- 3. Validate mask coordinates from database -------------------------
    const { maskX, maskY, maskWidth, maskHeight } = hall;
    if (!maskWidth || maskWidth <= 0 || !maskHeight || maskHeight <= 0) {
      return NextResponse.json({
        error: `Invalid mask dimensions for hall "${hall.name}". maskWidth=${maskWidth}, maskHeight=${maskHeight}. Please configure the bounding box in Admin panel.`
      }, { status: 422 });
    }

    // -- 4. Load base image -------------------------------------------------
    let baseImageBuffer: Buffer;
    const imageUrl = hall.baseImageUrl;

    if (imageUrl.startsWith('/')) {
      // Local file from /public
      const { readFile } = await import('fs/promises');
      const { join } = await import('path');
      baseImageBuffer = await readFile(join(process.cwd(), 'public', imageUrl));
    } else {
      // Remote URL
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        return NextResponse.json({ error: `Failed to fetch base image: ${response.statusText}` }, { status: 502 });
      }
      const arrayBuf = await response.arrayBuffer();
      baseImageBuffer = Buffer.from(arrayBuf);
    }

    // -- 5. Get base image actual dimensions --------------------------------
    const baseMetadata = await sharp(baseImageBuffer).metadata();
    const baseW = baseMetadata.width ?? 1200;
    const baseH = baseMetadata.height ?? 800;

    // Clamp mask coords to actual image bounds
    const clampedMaskX = Math.max(0, Math.min(maskX, baseW - 1));
    const clampedMaskY = Math.max(0, Math.min(maskY, baseH - 1));
    const clampedMaskW = Math.max(1, Math.min(maskWidth, baseW - clampedMaskX));
    const clampedMaskH = Math.max(1, Math.min(maskHeight, baseH - clampedMaskY));

    // -- 6. Load and resize banner to fit the mask slot ---------------------
    const bannerBytes = await bannerFile.arrayBuffer();
    const bannerBuffer = Buffer.from(bannerBytes);

    const resizedBanner = await sharp(bannerBuffer)
      .resize({
        width:  clampedMaskW,
        height: clampedMaskH,
        fit:    'fill',
      })
      .png()
      .toBuffer();

    // -- 7. Composite banner onto base image --------------------------------
    const compositedBuffer = await sharp(baseImageBuffer)
      .resize({ width: baseW, height: baseH, fit: 'inside' })
      .composite([{
        input: resizedBanner,
        left:  clampedMaskX,
        top:   clampedMaskY,
      }])
      .png()
      .toBuffer();

    // -- 8. Return base64 --------------------------------------------------
    const base64 = compositedBuffer.toString('base64');
    return NextResponse.json({
      imageBase64: `data:image/png;base64,${base64}`,
      mimeType: 'image/png',
      hallName: hall.name,
      eventName: eventName || '',
      maskUsed: { x: clampedMaskX, y: clampedMaskY, w: clampedMaskW, h: clampedMaskH },
    });

  } catch (error: unknown) {
    console.error('POST /api/generate-visualization error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Compositing failed: ${message}` }, { status: 500 });
  }
}
