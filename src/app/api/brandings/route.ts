import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/brandings - list all branding templates with logos
export async function GET() {
  try {
    const brandings = await prisma.brandingTemplate.findMany({
      include: { logos: true },
      orderBy: { templateName: 'asc' },
    });
    return NextResponse.json(brandings);
  } catch (error) {
    console.error('GET /api/brandings error:', error);
    return NextResponse.json({ error: 'Failed to fetch brandings' }, { status: 500 });
  }
}
