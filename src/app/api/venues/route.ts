import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/venues?cityId=1 - list venues by city
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('cityId');
    if (!cityId) {
      return NextResponse.json({ error: 'cityId is required' }, { status: 400 });
    }
    const venues = await prisma.venue.findMany({
      where: { cityId: parseInt(cityId, 10) },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(venues);
  } catch (error) {
    console.error('GET /api/venues error:', error);
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 });
  }
}
