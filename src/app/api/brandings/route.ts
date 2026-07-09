import { NextResponse } from 'next/server';
import { readDB, writeDB, Branding } from '@/lib/db';

export async function GET() {
  const db = readDB();
  return NextResponse.json(db.brandings);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, logos } = body;

    if (!name || !logos || !Array.isArray(logos)) {
      return NextResponse.json({ error: 'Name and logos (array of strings) are required' }, { status: 400 });
    }

    const db = readDB();
    const newId = db.brandings.length > 0 ? Math.max(...db.brandings.map(b => b.id)) + 1 : 1;
    
    const newBranding: Branding = {
      id: newId,
      name,
      logos
    };

    db.brandings.push(newBranding);
    writeDB(db);

    return NextResponse.json(newBranding, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
