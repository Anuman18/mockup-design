import { NextResponse } from 'next/server';
import { readDB, writeDB, Template } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const db = readDB();

  let templates = db.templates;
  if (type) {
    templates = templates.filter(t => t.type === type);
  }

  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, value } = body;

    if (!name || !type || !value) {
      return NextResponse.json({ error: 'Name, type, and value are required' }, { status: 400 });
    }

    if (!['stage', 'seating', 'theme'].includes(type)) {
      return NextResponse.json({ error: 'Type must be stage, seating, or theme' }, { status: 400 });
    }

    const db = readDB();
    const newId = db.templates.length > 0 ? Math.max(...db.templates.map(t => t.id)) + 1 : 1;
    
    const newTemplate: Template = {
      id: newId,
      name,
      type,
      value
    };

    db.templates.push(newTemplate);
    writeDB(db);

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
