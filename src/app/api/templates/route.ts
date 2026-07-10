import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/templates - list stage and seating templates
export async function GET() {
  try {
    const [stages, seatings] = await Promise.all([
      prisma.stageTemplate.findMany({ orderBy: { name: 'asc' } }),
      prisma.seatingTemplate.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return NextResponse.json({ stages, seatings });
  } catch (error) {
    console.error('GET /api/templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
