import { NextResponse } from 'next/server';
import { readDB, writeDB, Hall } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get('venueId');
  const db = readDB();

  let halls = db.halls;
  if (venueId) {
    halls = halls.filter(h => h.venue_id === Number(venueId));
  }

  return NextResponse.json(halls);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { venue_id, name, width, length, height, capacity } = body;

    if (!venue_id || !name || !width || !length || !height || !capacity) {
      return NextResponse.json({ error: 'All fields (venue_id, name, width, length, height, capacity) are required' }, { status: 400 });
    }

    const db = readDB();
    
    // Validate venue exists
    const venueExists = db.venues.some(v => v.id === Number(venue_id));
    if (!venueExists) {
      return NextResponse.json({ error: 'Invalid Venue ID' }, { status: 400 });
    }

    const newId = db.halls.length > 0 ? Math.max(...db.halls.map(h => h.id)) + 1 : 1;
    const newHall: Hall = {
      id: newId,
      venue_id: Number(venue_id),
      name,
      width: Number(width),
      length: Number(length),
      height: Number(height),
      capacity: Number(capacity)
    };

    db.halls.push(newHall);
    writeDB(db);

    return NextResponse.json(newHall, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
