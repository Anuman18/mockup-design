import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// Helper to save uploaded files safely
async function saveUploadFile(file: File | null, subfolder: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
  await mkdir(uploadsDir, { recursive: true });
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${subfolder}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadsDir, filename), Buffer.from(bytes));
  return `/uploads/${subfolder}/${filename}`;
}

// GET /api/admin/halls
export async function GET() {
  try {
    const halls = await prisma.venueHall.findMany({
      include: { venue: { include: { city: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(halls);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch halls' }, { status: 500 });
  }
}

// POST /api/admin/halls
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const venueId          = formData.get('venueId') as string;
    const name             = formData.get('name') as string;
    const length           = formData.get('length') as string;
    const width            = formData.get('width') as string;
    const height           = formData.get('height') as string;
    const capacity         = formData.get('capacity') as string;
    let centerMaskX        = parseInt(formData.get('centerMaskX') as string) || 0;
    let centerMaskY        = parseInt(formData.get('centerMaskY') as string) || 0;
    let centerMaskWidth    = parseInt(formData.get('centerMaskWidth') as string) || 0;
    let centerMaskHeight   = parseInt(formData.get('centerMaskHeight') as string) || 0;
    let leftMaskX          = parseInt(formData.get('leftMaskX') as string) || 0;
    let leftMaskY          = parseInt(formData.get('leftMaskY') as string) || 0;
    let leftMaskWidth      = parseInt(formData.get('leftMaskWidth') as string) || 0;
    let leftMaskHeight     = parseInt(formData.get('leftMaskHeight') as string) || 0;
    let rightMaskX         = parseInt(formData.get('rightMaskX') as string) || 0;
    let rightMaskY         = parseInt(formData.get('rightMaskY') as string) || 0;
    let rightMaskWidth     = parseInt(formData.get('rightMaskWidth') as string) || 0;
    let rightMaskHeight    = parseInt(formData.get('rightMaskHeight') as string) || 0;
    
    // File parameters
    const baseImage        = formData.get('baseImage') as File | null;
    const floorPlan        = formData.get('floorPlan') as File | null;
    const refPhoto1        = formData.get('refPhoto1') as File | null;
    const refPhoto2        = formData.get('refPhoto2') as File | null;

    if (!venueId || !name?.trim()) {
      return NextResponse.json({ error: 'venueId and name are required' }, { status: 400 });
    }

    let baseImageUrl = formData.get('baseImageUrl') as string | null;
    let floorPlanUrl = formData.get('floorPlanUrl') as string | null;
    let refPhotoUrl1 = formData.get('refPhotoUrl1') as string | null;
    let refPhotoUrl2 = formData.get('refPhotoUrl2') as string | null;

    // Handle uploads
    const uploadedBase = await saveUploadFile(baseImage, 'halls');
    if (uploadedBase) baseImageUrl = uploadedBase;

    const uploadedPlan = await saveUploadFile(floorPlan, 'plans');
    if (uploadedPlan) floorPlanUrl = uploadedPlan;

    const uploadedPhoto1 = await saveUploadFile(refPhoto1, 'gallery');
    if (uploadedPhoto1) refPhotoUrl1 = uploadedPhoto1;

    const uploadedPhoto2 = await saveUploadFile(refPhoto2, 'gallery');
    if (uploadedPhoto2) refPhotoUrl2 = uploadedPhoto2;

    // Create intermediate record
    const hall = await prisma.venueHall.create({
      data: {
        venueId:          parseInt(venueId, 10),
        name:             name.trim(),
        length:           parseFloat(length) || 0,
        width:            parseFloat(width) || 0,
        height:           parseFloat(height) || 0,
        capacity:         parseInt(capacity) || 0,
        baseImageUrl,
        floorPlanUrl,
        refPhotoUrl1,
        refPhotoUrl2,
        centerMaskX,
        centerMaskY,
        centerMaskWidth,
        centerMaskHeight,
        leftMaskX,
        leftMaskY,
        leftMaskWidth,
        leftMaskHeight,
        rightMaskX,
        rightMaskY,
        rightMaskWidth,
        rightMaskHeight,
      },
    });

    // Run dynamic stage analysis on uploaded hall photo if coordinates are not manually configured
    const isManualConfig = centerMaskWidth > 0 || leftMaskWidth > 0 || rightMaskWidth > 0;
    if (baseImageUrl) {
      try {
        const { analyzeStageLayout, saveStageTemplateJson } = await import('@/lib/stage-analyzer');
        const fs = await import('fs/promises');
        const imagePath = path.join(process.cwd(), 'public', baseImageUrl);
        const imageBuffer = await fs.readFile(imagePath);
        const metadata = await sharp(imageBuffer).metadata();
        const W = metadata.width || 1200;
        const H = metadata.height || 800;

        let analysis;
        if (!isManualConfig) {
          analysis = await analyzeStageLayout(imageBuffer, W, H);
          await saveStageTemplateJson(hall.id, analysis);

          // Update the hall record with AI-detected coordinates
          await prisma.venueHall.update({
            where: { id: hall.id },
            data: {
              centerMaskX:      analysis.main_screen.bbox.x,
              centerMaskY:      analysis.main_screen.bbox.y,
              centerMaskWidth:  analysis.main_screen.bbox.width,
              centerMaskHeight: analysis.main_screen.bbox.height,
              leftMaskX:        analysis.left_screen?.bbox.x ?? 0,
              leftMaskY:        analysis.left_screen?.bbox.y ?? 0,
              leftMaskWidth:    analysis.left_screen?.bbox.width ?? 0,
              leftMaskHeight:   analysis.left_screen?.bbox.height ?? 0,
              rightMaskX:       analysis.right_screen?.bbox.x ?? 0,
              rightMaskY:       analysis.right_screen?.bbox.y ?? 0,
              rightMaskWidth:   analysis.right_screen?.bbox.width ?? 0,
              rightMaskHeight:  analysis.right_screen?.bbox.height ?? 0,
            }
          });
        } else {
          // Build template JSON from manual coordinates
          const getPoly = (bb: { x: number, y: number, width: number, height: number }, skew = 0) => [
            [bb.x, bb.y],
            [bb.x + bb.width, bb.y + skew],
            [bb.x + bb.width, bb.y + bb.height + skew],
            [bb.x, bb.y + bb.height]
          ] as [number, number][];

          const mainBbox = { x: centerMaskX, y: centerMaskY, width: centerMaskWidth, height: centerMaskHeight };
          const leftBbox = { x: leftMaskX, y: leftMaskY, width: leftMaskWidth, height: leftMaskHeight };
          const rightBbox = { x: rightMaskX, y: rightMaskY, width: rightMaskWidth, height: rightMaskHeight };

          analysis = {
            main_screen: {
              polygon: getPoly(mainBbox, 0),
              bbox: mainBbox,
              safe_area: {
                x: Math.round(mainBbox.x + mainBbox.width * 0.08),
                y: Math.round(mainBbox.y + mainBbox.height * 0.08),
                width: Math.round(mainBbox.width * 0.84),
                height: Math.round(mainBbox.height * 0.84)
              }
            },
            left_screen: leftMaskWidth > 0 ? {
              polygon: getPoly(leftBbox, 3.5),
              bbox: leftBbox,
              safe_area: {
                x: Math.round(leftBbox.x + leftBbox.width * 0.08),
                y: Math.round(leftBbox.y + leftBbox.height * 0.08),
                width: Math.round(leftBbox.width * 0.84),
                height: Math.round(leftBbox.height * 0.84)
              }
            } : null,
            right_screen: rightMaskWidth > 0 ? {
              polygon: getPoly(rightBbox, -3.5),
              bbox: rightBbox,
              safe_area: {
                x: Math.round(rightBbox.x + rightBbox.width * 0.08),
                y: Math.round(rightBbox.y + rightBbox.height * 0.08),
                width: Math.round(rightBbox.width * 0.84),
                height: Math.round(rightBbox.height * 0.84)
              }
            } : null
          };
          await saveStageTemplateJson(hall.id, analysis);
        }
      } catch (analyzeErr) {
        console.error('Error analyzing stage coordinates during POST:', analyzeErr);
      }
    }

    // Load final updated record
    const finalHall = await prisma.venueHall.findUnique({ where: { id: hall.id } });
    return NextResponse.json(finalHall, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/halls error:', error);
    return NextResponse.json({ error: 'Failed to create hall' }, { status: 500 });
  }
}

// PUT /api/admin/halls
export async function PUT(request: Request) {
  try {
    const formData = await request.formData();
    const id               = formData.get('id') as string;
    let centerMaskX        = parseInt(formData.get('centerMaskX') as string) || 0;
    let centerMaskY        = parseInt(formData.get('centerMaskY') as string) || 0;
    let centerMaskWidth    = parseInt(formData.get('centerMaskWidth') as string) || 0;
    let centerMaskHeight   = parseInt(formData.get('centerMaskHeight') as string) || 0;
    let leftMaskX          = parseInt(formData.get('leftMaskX') as string) || 0;
    let leftMaskY          = parseInt(formData.get('leftMaskY') as string) || 0;
    let leftMaskWidth      = parseInt(formData.get('leftMaskWidth') as string) || 0;
    let leftMaskHeight     = parseInt(formData.get('leftMaskHeight') as string) || 0;
    let rightMaskX         = parseInt(formData.get('rightMaskX') as string) || 0;
    let rightMaskY         = parseInt(formData.get('rightMaskY') as string) || 0;
    let rightMaskWidth     = parseInt(formData.get('rightMaskWidth') as string) || 0;
    let rightMaskHeight    = parseInt(formData.get('rightMaskHeight') as string) || 0;

    const baseImage        = formData.get('baseImage') as File | null;
    const floorPlan        = formData.get('floorPlan') as File | null;
    const refPhoto1        = formData.get('refPhoto1') as File | null;
    const refPhoto2        = formData.get('refPhoto2') as File | null;

    let baseImageUrl = formData.get('baseImageUrl') as string | null;
    let floorPlanUrl = formData.get('floorPlanUrl') as string | null;
    let refPhotoUrl1 = formData.get('refPhotoUrl1') as string | null;
    let refPhotoUrl2 = formData.get('refPhotoUrl2') as string | null;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const uploadedBase = await saveUploadFile(baseImage, 'halls');
    if (uploadedBase) baseImageUrl = uploadedBase;

    const uploadedPlan = await saveUploadFile(floorPlan, 'plans');
    if (uploadedPlan) floorPlanUrl = uploadedPlan;

    const uploadedPhoto1 = await saveUploadFile(refPhoto1, 'gallery');
    if (uploadedPhoto1) refPhotoUrl1 = uploadedPhoto1;

    const uploadedPhoto2 = await saveUploadFile(refPhoto2, 'gallery');
    if (uploadedPhoto2) refPhotoUrl2 = uploadedPhoto2;

    const updateData: Record<string, unknown> = {
      centerMaskX,
      centerMaskY,
      centerMaskWidth,
      centerMaskHeight,
      leftMaskX,
      leftMaskY,
      leftMaskWidth,
      leftMaskHeight,
      rightMaskX,
      rightMaskY,
      rightMaskWidth,
      rightMaskHeight,
    };
    if (baseImageUrl) updateData.baseImageUrl = baseImageUrl;
    if (floorPlanUrl) updateData.floorPlanUrl = floorPlanUrl;
    if (refPhotoUrl1) updateData.refPhotoUrl1 = refPhotoUrl1;
    if (refPhotoUrl2) updateData.refPhotoUrl2 = refPhotoUrl2;

    // Run dynamic stage analysis on uploaded hall photo if coordinates are not manually configured
    const isManualConfig = centerMaskWidth > 0 || leftMaskWidth > 0 || rightMaskWidth > 0;
    if (baseImageUrl) {
      try {
        const { analyzeStageLayout, saveStageTemplateJson } = await import('@/lib/stage-analyzer');
        const fs = await import('fs/promises');
        const imagePath = path.join(process.cwd(), 'public', baseImageUrl);
        const imageBuffer = await fs.readFile(imagePath);
        const metadata = await sharp(imageBuffer).metadata();
        const W = metadata.width || 1200;
        const H = metadata.height || 800;

        let analysis;
        if (!isManualConfig) {
          analysis = await analyzeStageLayout(imageBuffer, W, H);

          // Update with AI-detected coordinates
          updateData.centerMaskX      = analysis.main_screen.bbox.x;
          updateData.centerMaskY      = analysis.main_screen.bbox.y;
          updateData.centerMaskWidth  = analysis.main_screen.bbox.width;
          updateData.centerMaskHeight = analysis.main_screen.bbox.height;
          updateData.leftMaskX        = analysis.left_screen?.bbox.x ?? 0;
          updateData.leftMaskY        = analysis.left_screen?.bbox.y ?? 0;
          updateData.leftMaskWidth    = analysis.left_screen?.bbox.width ?? 0;
          updateData.leftMaskHeight   = analysis.left_screen?.bbox.height ?? 0;
          updateData.rightMaskX       = analysis.right_screen?.bbox.x ?? 0;
          updateData.rightMaskY       = analysis.right_screen?.bbox.y ?? 0;
          updateData.rightMaskWidth   = analysis.right_screen?.bbox.width ?? 0;
          updateData.rightMaskHeight  = analysis.right_screen?.bbox.height ?? 0;
        } else {
          // Build template JSON from manual coordinates
          const getPoly = (bb: { x: number, y: number, width: number, height: number }, skew = 0) => [
            [bb.x, bb.y],
            [bb.x + bb.width, bb.y + skew],
            [bb.x + bb.width, bb.y + bb.height + skew],
            [bb.x, bb.y + bb.height]
          ] as [number, number][];

          const mainBbox = { x: centerMaskX, y: centerMaskY, width: centerMaskWidth, height: centerMaskHeight };
          const leftBbox = { x: leftMaskX, y: leftMaskY, width: leftMaskWidth, height: leftMaskHeight };
          const rightBbox = { x: rightMaskX, y: rightMaskY, width: rightMaskWidth, height: rightMaskHeight };

          analysis = {
            main_screen: {
              polygon: getPoly(mainBbox, 0),
              bbox: mainBbox,
              safe_area: {
                x: Math.round(mainBbox.x + mainBbox.width * 0.08),
                y: Math.round(mainBbox.y + mainBbox.height * 0.08),
                width: Math.round(mainBbox.width * 0.84),
                height: Math.round(mainBbox.height * 0.84)
              }
            },
            left_screen: leftMaskWidth > 0 ? {
              polygon: getPoly(leftBbox, 3.5),
              bbox: leftBbox,
              safe_area: {
                x: Math.round(leftBbox.x + leftBbox.width * 0.08),
                y: Math.round(leftBbox.y + leftBbox.height * 0.08),
                width: Math.round(leftBbox.width * 0.84),
                height: Math.round(leftBbox.height * 0.84)
              }
            } : null,
            right_screen: rightMaskWidth > 0 ? {
              polygon: getPoly(rightBbox, -3.5),
              bbox: rightBbox,
              safe_area: {
                x: Math.round(rightBbox.x + rightBbox.width * 0.08),
                y: Math.round(rightBbox.y + rightBbox.height * 0.08),
                width: Math.round(rightBbox.width * 0.84),
                height: Math.round(rightBbox.height * 0.84)
              }
            } : null
          };
        }
        await saveStageTemplateJson(parseInt(id, 10), analysis);
      } catch (analyzeErr) {
        console.error('Error analyzing stage coordinates during PUT:', analyzeErr);
      }
    }

    const hall = await prisma.venueHall.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });
    return NextResponse.json(hall);
  } catch (error) {
    console.error('PUT /api/admin/halls error:', error);
    return NextResponse.json({ error: 'Failed to update hall' }, { status: 500 });
  }
}

// DELETE /api/admin/halls
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await prisma.venueHall.delete({ where: { id: parseInt(id, 10) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/halls error:', error);
    return NextResponse.json({ error: 'Failed to delete hall' }, { status: 500 });
  }
}
