import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/cities - list all active cities
export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(cities);
  } catch (error) {
    console.error('GET /api/cities error:', error);
    return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 });
  }
}
