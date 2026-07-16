import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

/**
 * GET: Lists all versions of a mockup.
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

    const versions = await prisma.mockupVersion.findMany({
      where: { mockupId },
      orderBy: { versionNumber: 'desc' }
    });

    return NextResponse.json(versions);

  } catch (err: any) {
    console.error('List mockup versions API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST: Saves a new mockup version, duplicates, or restores an older version.
 */
export async function POST(
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
    const { config, imageUrl, duplicateFromVersion, restoreFromVersion } = body;

    // Fetch maximum version number currently present
    const versions = await prisma.mockupVersion.findMany({
      where: { mockupId },
      orderBy: { versionNumber: 'desc' }
    });
    const maxVerNum = versions.length > 0 ? versions[0].versionNumber : 0;
    const nextVerNum = maxVerNum + 1;

    let finalConfig = config;
    let finalImageUrl = imageUrl || '';

    // Handle Restoration workflow
    if (restoreFromVersion) {
      const targetVersion = versions.find(v => v.versionNumber === parseInt(restoreFromVersion, 10));
      if (!targetVersion) {
        return NextResponse.json({ error: 'Version to restore not found.' }, { status: 404 });
      }
      finalConfig = targetVersion.config;
      finalImageUrl = targetVersion.imageUrl;
    }

    // Handle Duplication workflow
    if (duplicateFromVersion) {
      const targetVersion = versions.find(v => v.versionNumber === parseInt(duplicateFromVersion, 10));
      if (!targetVersion) {
        return NextResponse.json({ error: 'Version to duplicate not found.' }, { status: 404 });
      }
      finalConfig = targetVersion.config;
      finalImageUrl = targetVersion.imageUrl;
    }

    if (!finalConfig) {
      return NextResponse.json({ error: 'Mockup config is required to save version.' }, { status: 400 });
    }

    const newVersion = await prisma.mockupVersion.create({
      data: {
        mockupId,
        versionNumber: nextVerNum,
        imageUrl: finalImageUrl,
        config: typeof finalConfig === 'string' ? finalConfig : JSON.stringify(finalConfig)
      }
    });

    return NextResponse.json(newVersion, { status: 201 });

  } catch (err: any) {
    console.error('Create mockup version API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
