import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/admin/venues - list all venues with city info
export async function GET() {
  try {
    const venues = await prisma.venue.findMany({
      include: { city: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(venues);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 });
  }
}

// POST /api/admin/venues - create a new venue
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cityId, name, address } = body;
    if (!cityId || !name?.trim() || !address?.trim()) {
      return NextResponse.json({ error: 'cityId, name and address are required' }, { status: 400 });
    }
    const venue = await prisma.venue.create({
      data: {
        cityId: parseInt(cityId, 10),
        name: name.trim(),
        address: address.trim(),
      },
    });
    return NextResponse.json(venue, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/venues error:', error);
    return NextResponse.json({ error: 'Failed to create venue' }, { status: 500 });
  }
}

// DELETE /api/admin/venues - delete a venue by id
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await prisma.venue.delete({ where: { id: parseInt(id, 10) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/venues error:', error);
    return NextResponse.json({ error: 'Failed to delete venue' }, { status: 500 });
  }
}
