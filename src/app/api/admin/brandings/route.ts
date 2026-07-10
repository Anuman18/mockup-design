import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/admin/brandings
export async function GET() {
  try {
    const brandings = await prisma.brandingTemplate.findMany({
      include: { logos: true },
      orderBy: { templateName: 'asc' },
    });
    return NextResponse.json(brandings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch brandings' }, { status: 500 });
  }
}

// POST /api/admin/brandings - create branding template with logos
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateName, logos } = body;
    if (!templateName?.trim()) {
      return NextResponse.json({ error: 'templateName is required' }, { status: 400 });
    }
    const branding = await prisma.brandingTemplate.create({
      data: {
        templateName: templateName.trim(),
        logos: {
          create: (logos || [])
            .filter((l: string) => l?.trim())
            .map((l: string) => ({ logoName: l.trim() })),
        },
      },
      include: { logos: true },
    });
    return NextResponse.json(branding, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/brandings error:', error);
    return NextResponse.json({ error: 'Failed to create branding' }, { status: 500 });
  }
}

// DELETE /api/admin/brandings?id=1
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await prisma.brandingTemplate.delete({ where: { id: parseInt(id, 10) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/brandings error:', error);
    return NextResponse.json({ error: 'Failed to delete branding' }, { status: 500 });
  }
}
