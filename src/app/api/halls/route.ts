import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/halls?venueId=1 - list halls by venue
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    if (!venueId) {
      return NextResponse.json({ error: 'venueId is required' }, { status: 400 });
    }
    const halls = await prisma.venueHall.findMany({
      where: { venueId: parseInt(venueId, 10) },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(halls);
  } catch (error) {
    console.error('GET /api/halls error:', error);
    return NextResponse.json({ error: 'Failed to fetch halls' }, { status: 500 });
  }
}
