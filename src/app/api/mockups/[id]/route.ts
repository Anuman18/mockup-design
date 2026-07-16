import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

/**
 * GET: Retrieves a single mockup with all version histories.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { id } = await params;
    const mockupId = parseInt(id, 10);
    if (isNaN(mockupId)) {
      return NextResponse.json({ error: 'Invalid mockup ID' }, { status: 400 });
    }

    const mockup = await prisma.mockup.findUnique({
      where: { id: mockupId },
      include: {
        venue: true,
        hall: true,
        versions: {
          orderBy: { versionNumber: 'desc' }
        }
      }
    });

    if (!mockup) {
      return NextResponse.json({ error: 'Mockup not found' }, { status: 404 });
    }

    return NextResponse.json(mockup);

  } catch (err: any) {
    console.error('Fetch mockup details API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT: Updates mockup fields (status, notes, designer, etc.).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { id } = await params;
    const mockupId = parseInt(id, 10);
    if (isNaN(mockupId)) {
      return NextResponse.json({ error: 'Invalid mockup ID' }, { status: 400 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.designer !== undefined) updateData.designer = body.designer;
    if (body.stageType !== undefined) updateData.stageType = body.stageType;
    if (body.category !== undefined) updateData.category = body.category;

    const updatedMockup = await prisma.mockup.update({
      where: { id: mockupId },
      data: updateData,
      include: {
        venue: true,
        hall: true,
        versions: {
          orderBy: { versionNumber: 'desc' }
        }
      }
    });

    return NextResponse.json(updatedMockup);

  } catch (err: any) {
    console.error('Update mockup API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE: Deletes mockup record and all version histories.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { id } = await params;
    const mockupId = parseInt(id, 10);
    if (isNaN(mockupId)) {
      return NextResponse.json({ error: 'Invalid mockup ID' }, { status: 400 });
    }

    const mockup = await prisma.mockup.findUnique({
      where: { id: mockupId }
    });

    if (!mockup) {
      return NextResponse.json({ error: 'Mockup not found' }, { status: 404 });
    }

    await prisma.mockup.delete({
      where: { id: mockupId }
    });

    return NextResponse.json({ success: true, message: 'Mockup deleted successfully' });

  } catch (err: any) {
    console.error('Delete mockup API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
