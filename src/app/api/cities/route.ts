import { NextResponse } from 'next/server';
import { readDB, writeDB, City } from '@/lib/db';

export async function GET() {
  const db = readDB();
  return NextResponse.json(db.cities);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, state } = body;
    
    if (!name || !state) {
      return NextResponse.json({ error: 'Name and state are required' }, { status: 400 });
    }

    const db = readDB();
    const newId = db.cities.length > 0 ? Math.max(...db.cities.map(c => c.id)) + 1 : 1;
    
    const newCity: City = {
      id: newId,
      name,
      state
    };

    db.cities.push(newCity);
    writeDB(db);

    return NextResponse.json(newCity, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
