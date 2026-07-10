import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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
    const centerMaskX      = formData.get('centerMaskX') as string;
    const centerMaskY      = formData.get('centerMaskY') as string;
    const centerMaskWidth  = formData.get('centerMaskWidth') as string;
    const centerMaskHeight = formData.get('centerMaskHeight') as string;
    const leftMaskX        = formData.get('leftMaskX') as string;
    const leftMaskY        = formData.get('leftMaskY') as string;
    const leftMaskWidth    = formData.get('leftMaskWidth') as string;
    const leftMaskHeight   = formData.get('leftMaskHeight') as string;
    const rightMaskX       = formData.get('rightMaskX') as string;
    const rightMaskY       = formData.get('rightMaskY') as string;
    const rightMaskWidth   = formData.get('rightMaskWidth') as string;
    const rightMaskHeight  = formData.get('rightMaskHeight') as string;
    
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
        centerMaskX:      parseInt(centerMaskX) || 0,
        centerMaskY:      parseInt(centerMaskY) || 0,
        centerMaskWidth:  parseInt(centerMaskWidth) || 0,
        centerMaskHeight: parseInt(centerMaskHeight) || 0,
        leftMaskX:        parseInt(leftMaskX) || 0,
        leftMaskY:        parseInt(leftMaskY) || 0,
        leftMaskWidth:    parseInt(leftMaskWidth) || 0,
        leftMaskHeight:   parseInt(leftMaskHeight) || 0,
        rightMaskX:       parseInt(rightMaskX) || 0,
        rightMaskY:       parseInt(rightMaskY) || 0,
        rightMaskWidth:   parseInt(rightMaskWidth) || 0,
        rightMaskHeight:  parseInt(rightMaskHeight) || 0,
      },
    });

    return NextResponse.json(hall, { status: 201 });
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
    const centerMaskX      = formData.get('centerMaskX') as string;
    const centerMaskY      = formData.get('centerMaskY') as string;
    const centerMaskWidth  = formData.get('centerMaskWidth') as string;
    const centerMaskHeight = formData.get('centerMaskHeight') as string;
    const leftMaskX        = formData.get('leftMaskX') as string;
    const leftMaskY        = formData.get('leftMaskY') as string;
    const leftMaskWidth    = formData.get('leftMaskWidth') as string;
    const leftMaskHeight   = formData.get('leftMaskHeight') as string;
    const rightMaskX       = formData.get('rightMaskX') as string;
    const rightMaskY       = formData.get('rightMaskY') as string;
    const rightMaskWidth   = formData.get('rightMaskWidth') as string;
    const rightMaskHeight  = formData.get('rightMaskHeight') as string;

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
      centerMaskX:      parseInt(centerMaskX) || 0,
      centerMaskY:      parseInt(centerMaskY) || 0,
      centerMaskWidth:  parseInt(centerMaskWidth) || 0,
      centerMaskHeight: parseInt(centerMaskHeight) || 0,
      leftMaskX:        parseInt(leftMaskX) || 0,
      leftMaskY:        parseInt(leftMaskY) || 0,
      leftMaskWidth:    parseInt(leftMaskWidth) || 0,
      leftMaskHeight:   parseInt(leftMaskHeight) || 0,
      rightMaskX:       parseInt(rightMaskX) || 0,
      rightMaskY:       parseInt(rightMaskY) || 0,
      rightMaskWidth:   parseInt(rightMaskWidth) || 0,
      rightMaskHeight:  parseInt(rightMaskHeight) || 0,
    };
    if (baseImageUrl) updateData.baseImageUrl = baseImageUrl;
    if (floorPlanUrl) updateData.floorPlanUrl = floorPlanUrl;
    if (refPhotoUrl1) updateData.refPhotoUrl1 = refPhotoUrl1;
    if (refPhotoUrl2) updateData.refPhotoUrl2 = refPhotoUrl2;

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
