import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/admin/cities - list all cities
export async function GET() {
  try {
    const cities = await prisma.city.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(cities);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 });
  }
}

// POST /api/admin/cities - create a new city
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, state } = body;
    if (!name?.trim() || !state?.trim()) {
      return NextResponse.json({ error: 'name and state are required' }, { status: 400 });
    }
    const city = await prisma.city.create({
      data: { name: name.trim(), state: state.trim() },
    });
    return NextResponse.json(city, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/cities error:', error);
    return NextResponse.json({ error: 'Failed to create city' }, { status: 500 });
  }
}

// DELETE /api/admin/cities - delete a city by id
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await prisma.city.delete({ where: { id: parseInt(id, 10) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/cities error:', error);
    return NextResponse.json({ error: 'Failed to delete city' }, { status: 500 });
  }
}
