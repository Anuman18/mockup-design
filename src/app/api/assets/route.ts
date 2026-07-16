import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * GET: Lists uploaded brand assets for an event.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventIdStr = searchParams.get('eventId');
    if (!eventIdStr) {
      return NextResponse.json({ error: 'eventId parameter is required' }, { status: 400 });
    }

    const eventId = parseInt(eventIdStr, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const assets = await prisma.asset.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(assets);

  } catch (err: any) {
    console.error('List assets API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST: Uploads a brand asset and saves record to DB.
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const formData = await request.formData();
    const eventIdStr = formData.get('eventId') as string;
    const assetType = formData.get('type') as string; // Logo, Sponsor Logo, Background, etc.
    const file = formData.get('file') as File;

    if (!eventIdStr || !assetType || !file || file.size === 0) {
      return NextResponse.json({ error: 'eventId, type, and file are required.' }, { status: 400 });
    }

    const eventId = parseInt(eventIdStr, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const originalExt = file.name.split('.').pop() || 'png';
    const cleanFilename = `asset_${uniqueSuffix}.${originalExt}`;
    
    // Save file locally to public/uploads/assets/
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'assets');
    const filePath = join(uploadsDir, cleanFilename);
    await writeFile(filePath, buffer);

    const assetUrl = `/uploads/assets/${cleanFilename}`;

    // Save database record
    const newAsset = await prisma.asset.create({
      data: {
        eventId,
        name: file.name,
        type: assetType,
        url: assetUrl,
        fileType: originalExt.toUpperCase()
      }
    });

    return NextResponse.json(newAsset, { status: 201 });

  } catch (err: any) {
    console.error('Upload asset API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
