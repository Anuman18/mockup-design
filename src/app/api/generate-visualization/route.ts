import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import sharp from 'sharp';

/**
 * Generates an SVG buffer overlay containing the Event Title and selected logos
 * fitted perfectly into a screen coordinate slot of width W and height H.
 */
function createScreenOverlaySvg(
  W: number,
  H: number,
  title: string,
  logos: string[]
): Buffer {
  const N = logos.length;

  // 1. Calculate Logo Badge sizes
  // We want badge width to be around 15% to 20% of screen width, max 140px.
  let badgeW = Math.min(W * 0.18, 140);
  let badgeH = Math.min(H * 0.14, 38);
  let gap = Math.min(20, W * 0.03);

  // If the total width of badges exceeds the screen width, scale down.
  const marginX = 20;
  const availableW = W - marginX * 2;
  const totalNeededW = N * badgeW + (N - 1) * gap;

  if (totalNeededW > availableW) {
    // scale down
    const scale = availableW / totalNeededW;
    badgeW = badgeW * scale;
    gap = gap * scale;
    badgeH = badgeH * scale;
  }

  // 2. Generate logo elements
  let logoElements = '';
  if (N === 1) {
    // Single logo: place at top right
    const lx = W - badgeW - 15;
    const ly = 12;
    logoElements = `
      <rect x="${lx}" y="${ly}" width="${badgeW}" height="${badgeH}" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="${lx + badgeW / 2}" y="${ly + badgeH / 2 + 4}" font-family="sans-serif" font-size="${Math.max(9, badgeH * 0.35)}px" font-weight="bold" fill="#334155" text-anchor="middle">${logos[0]}</text>
    `;
  } else if (N > 1) {
    // Multi logo: row of badges centered horizontally at the top
    const rowW = N * badgeW + (N - 1) * gap;
    const startX = (W - rowW) / 2;
    const ly = 12;

    logoElements = logos.map((logo, i) => {
      const lx = startX + i * (badgeW + gap);
      return `
        <rect x="${lx}" y="${ly}" width="${badgeW}" height="${badgeH}" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
        <text x="${lx + badgeW / 2}" y="${ly + badgeH / 2 + 4}" font-family="sans-serif" font-size="${Math.max(8, badgeH * 0.35)}px" font-weight="bold" fill="#334155" text-anchor="middle">${logo}</text>
      `;
    }).join('\n');
  }

  // 3. Render event title text with auto wrapping if long
  let textElement = '';
  const cleanTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Calculate dynamic font size based on box height and width
  const fontSize = Math.min(W * 0.055, H * 0.16, 42);

  if (cleanTitle.length > 25) {
    // Split into 2 lines
    const mid = Math.floor(cleanTitle.length / 2);
    let splitIdx = cleanTitle.indexOf(' ', mid);
    if (splitIdx === -1) splitIdx = cleanTitle.lastIndexOf(' ', mid);
    if (splitIdx === -1) splitIdx = mid;

    const line1 = cleanTitle.substring(0, splitIdx).trim();
    const line2 = cleanTitle.substring(splitIdx).trim();

    // Push text down slightly below logos row
    const startY = N > 0 ? (H * 0.58) : (H * 0.48);

    textElement = `
      <text x="50%" y="${startY}" font-family="sans-serif" font-size="${fontSize}px" font-weight="bold" fill="#0f172a" text-anchor="middle">
        <tspan x="50%" dy="0">${line1}</tspan>
        <tspan x="50%" dy="${fontSize + 6}">${line2}</tspan>
      </text>
    `;
  } else {
    const startY = N > 0 ? (H * 0.63) : (H * 0.54);
    textElement = `
      <text x="50%" y="${startY}" font-family="sans-serif" font-size="${fontSize}px" font-weight="extrabold" fill="#0f172a" text-anchor="middle">${cleanTitle}</text>
    `;
  }

  const svg = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Soft gradient background simulating dynamic LED screen -->
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#f1f5f9" />
        </linearGradient>
      </defs>
      <!-- Base screen panel fill -->
      <rect width="100%" height="100%" fill="url(#screenGrad)" />
      
      <!-- Logo row/badge elements -->
      ${logoElements}
      
      <!-- Event title text -->
      ${textElement}
    </svg>
  `;

  return Buffer.from(svg);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const hallId      = formData.get('hallId') as string;
    const eventName   = formData.get('eventName') as string;
    const screenConfig = (formData.get('screenConfig') || 'center') as 'center' | 'wings' | 'all';
    const logosJson   = formData.get('logos') as string;

    if (!hallId || isNaN(parseInt(hallId, 10))) {
      return NextResponse.json({ error: 'Valid hallId is required' }, { status: 400 });
    }
    if (!eventName?.trim()) {
      return NextResponse.json({ error: 'Event Title is required' }, { status: 400 });
    }

    const logos: string[] = logosJson ? JSON.parse(logosJson) : [];

    // Fetch venue hall
    const hall = await prisma.venueHall.findUnique({
      where: { id: parseInt(hallId, 10) },
    });
    if (!hall) {
      return NextResponse.json({ error: 'Hall not found' }, { status: 404 });
    }
    if (!hall.baseImageUrl) {
      return NextResponse.json({ error: 'This hall has no base image configured.' }, { status: 422 });
    }

    // Load base venue image
    let baseImageBuffer: Buffer;
    const imageUrl = hall.baseImageUrl;

    if (imageUrl.startsWith('/')) {
      const { readFile } = await import('fs/promises');
      const { join } = await import('path');
      baseImageBuffer = await readFile(join(process.cwd(), 'public', imageUrl));
    } else {
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        return NextResponse.json({ error: `Failed to fetch base image: ${response.statusText}` }, { status: 502 });
      }
      const arrayBuf = await response.arrayBuffer();
      baseImageBuffer = Buffer.from(arrayBuf);
    }

    const baseMetadata = await sharp(baseImageBuffer).metadata();
    const baseW = baseMetadata.width ?? 1200;
    const baseH = baseMetadata.height ?? 800;

    // Collect list of overlay configurations
    const composites: any[] = [];

    // Helper to validate and clamp coordinates
    const addScreenComposite = (
      x: number,
      y: number,
      w: number,
      h: number,
      label: string
    ) => {
      if (!w || w <= 0 || !h || h <= 0) return;
      const clampedX = Math.max(0, Math.min(x, baseW - 1));
      const clampedY = Math.max(0, Math.min(y, baseH - 1));
      const clampedW = Math.max(1, Math.min(w, baseW - clampedX));
      const clampedH = Math.max(1, Math.min(h, baseH - clampedY));

      const svgBuffer = createScreenOverlaySvg(clampedW, clampedH, eventName, logos);
      composites.push({
        input: svgBuffer,
        left: clampedX,
        top: clampedY,
      });
    };

    // Composite according to stage screen configurations
    // 1. Center Screen (Always composite Center if center is selected, or if configuration calls for it)
    addScreenComposite(
      hall.centerMaskX,
      hall.centerMaskY,
      hall.centerMaskWidth,
      hall.centerMaskHeight,
      'Center'
    );

    // 2. Left and Right screens
    if (screenConfig === 'wings' || screenConfig === 'all') {
      addScreenComposite(
        hall.leftMaskX,
        hall.leftMaskY,
        hall.leftMaskWidth,
        hall.leftMaskHeight,
        'Left'
      );
      addScreenComposite(
        hall.rightMaskX,
        hall.rightMaskY,
        hall.rightMaskWidth,
        hall.rightMaskHeight,
        'Right'
      );
    }

    if (composites.length === 0) {
      return NextResponse.json({
        error: `No screen coordinates defined for this hall. Please edit coordinates in the Admin panel.`
      }, { status: 422 });
    }

    // Composite all active screen overlays onto the base venue image
    const compositedBuffer = await sharp(baseImageBuffer)
      .resize({ width: baseW, height: baseH, fit: 'inside' })
      .composite(composites)
      .png()
      .toBuffer();

    const base64 = compositedBuffer.toString('base64');
    return NextResponse.json({
      imageBase64: `data:image/png;base64,${base64}`,
      mimeType: 'image/png',
      hallName: hall.name,
      eventName: eventName,
      screensProcessed: composites.length,
    });

  } catch (error: any) {
    console.error('Compositing failed:', error);
    return NextResponse.json({ error: `Compositing failed: ${error.message}` }, { status: 500 });
  }
}
