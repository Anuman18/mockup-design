import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * GET: Lists all stage visual templates.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';

    const where: any = {};
    if (category) {
      where.category = category;
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(templates);

  } catch (err: any) {
    console.error('List templates API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST: Uploads a custom template screen backdrop.
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const category = formData.get('category') as string; // Hotel, Convention Center, etc.
    const file = formData.get('file') as File;

    // Bounding screen coords (defaults to 0 if not passed)
    const centerMaskX = parseInt((formData.get('centerMaskX') || '0') as string, 10);
    const centerMaskY = parseInt((formData.get('centerMaskY') || '0') as string, 10);
    const centerMaskWidth = parseInt((formData.get('centerMaskWidth') || '0') as string, 10);
    const centerMaskHeight = parseInt((formData.get('centerMaskHeight') || '0') as string, 10);

    const leftMaskX = parseInt((formData.get('leftMaskX') || '0') as string, 10);
    const leftMaskY = parseInt((formData.get('leftMaskY') || '0') as string, 10);
    const leftMaskWidth = parseInt((formData.get('leftMaskWidth') || '0') as string, 10);
    const leftMaskHeight = parseInt((formData.get('leftMaskHeight') || '0') as string, 10);

    const rightMaskX = parseInt((formData.get('rightMaskX') || '0') as string, 10);
    const rightMaskY = parseInt((formData.get('rightMaskY') || '0') as string, 10);
    const rightMaskWidth = parseInt((formData.get('rightMaskWidth') || '0') as string, 10);
    const rightMaskHeight = parseInt((formData.get('rightMaskHeight') || '0') as string, 10);

    if (!name || !category || !file || file.size === 0) {
      return NextResponse.json({ error: 'name, category, and backdrop file are required.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save custom template file
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const originalExt = file.name.split('.').pop() || 'png';
    const cleanFilename = `template_${uniqueSuffix}.${originalExt}`;
    
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'templates');
    const filePath = join(uploadsDir, cleanFilename);
    await writeFile(filePath, buffer);

    const imageUrl = `/uploads/templates/${cleanFilename}`;

    const newTemplate = await prisma.template.create({
      data: {
        name,
        category,
        imageUrl,
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
        rightMaskHeight
      }
    });

    return NextResponse.json(newTemplate, { status: 201 });

  } catch (err: any) {
    console.error('Create template API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
