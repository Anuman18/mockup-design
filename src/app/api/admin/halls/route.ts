import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET /api/admin/halls - list all halls with venue info
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

// POST /api/admin/halls - create hall with base image upload + mask coordinates
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const venueId    = formData.get('venueId') as string;
    const name       = formData.get('name') as string;
    const length     = formData.get('length') as string;
    const width      = formData.get('width') as string;
    const height     = formData.get('height') as string;
    const capacity   = formData.get('capacity') as string;
    const maskX      = formData.get('maskX') as string;
    const maskY      = formData.get('maskY') as string;
    const maskWidth  = formData.get('maskWidth') as string;
    const maskHeight = formData.get('maskHeight') as string;
    const baseImage  = formData.get('baseImage') as File | null;

    if (!venueId || !name?.trim()) {
      return NextResponse.json({ error: 'venueId and name are required' }, { status: 400 });
    }

    let baseImageUrl: string | null = formData.get('baseImageUrl') as string | null;

    // Handle image upload
    if (baseImage && baseImage.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'halls');
      await mkdir(uploadsDir, { recursive: true });
      const ext = baseImage.name.split('.').pop() || 'jpg';
      const filename = `hall_${Date.now()}.${ext}`;
      const bytes = await baseImage.arrayBuffer();
      await writeFile(path.join(uploadsDir, filename), Buffer.from(bytes));
      baseImageUrl = `/uploads/halls/${filename}`;
    }

    const hall = await prisma.venueHall.create({
      data: {
        venueId:     parseInt(venueId, 10),
        name:        name.trim(),
        length:      parseFloat(length) || 0,
        width:       parseFloat(width) || 0,
        height:      parseFloat(height) || 0,
        capacity:    parseInt(capacity) || 0,
        baseImageUrl: baseImageUrl || null,
        maskX:       parseInt(maskX) || 0,
        maskY:       parseInt(maskY) || 0,
        maskWidth:   parseInt(maskWidth) || 0,
        maskHeight:  parseInt(maskHeight) || 0,
      },
    });

    return NextResponse.json(hall, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/halls error:', error);
    return NextResponse.json({ error: 'Failed to create hall' }, { status: 500 });
  }
}

// PUT /api/admin/halls - update hall mask coordinates and base image
export async function PUT(request: Request) {
  try {
    const formData = await request.formData();
    const id         = formData.get('id') as string;
    const maskX      = formData.get('maskX') as string;
    const maskY      = formData.get('maskY') as string;
    const maskWidth  = formData.get('maskWidth') as string;
    const maskHeight = formData.get('maskHeight') as string;
    const baseImage  = formData.get('baseImage') as File | null;
    let   baseImageUrl = formData.get('baseImageUrl') as string | null;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    if (baseImage && baseImage.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'halls');
      await mkdir(uploadsDir, { recursive: true });
      const ext = baseImage.name.split('.').pop() || 'jpg';
      const filename = `hall_${Date.now()}.${ext}`;
      const bytes = await baseImage.arrayBuffer();
      await writeFile(path.join(uploadsDir, filename), Buffer.from(bytes));
      baseImageUrl = `/uploads/halls/${filename}`;
    }

    const updateData: Record<string, unknown> = {
      maskX:      parseInt(maskX) || 0,
      maskY:      parseInt(maskY) || 0,
      maskWidth:  parseInt(maskWidth) || 0,
      maskHeight: parseInt(maskHeight) || 0,
    };
    if (baseImageUrl) updateData.baseImageUrl = baseImageUrl;

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

// DELETE /api/admin/halls - delete hall by id
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
