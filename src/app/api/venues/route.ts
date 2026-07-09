import { NextResponse } from 'next/server';
import { readDB, writeDB, Venue } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get('cityId');
  const db = readDB();

  let venues = db.venues;
  if (cityId) {
    venues = venues.filter(v => v.city_id === Number(cityId));
  }

  return NextResponse.json(venues);
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let city_id: any;
    let name: string = '';
    let address: string = '';
    let image_url: string = '';
    let mask_x: any;
    let mask_y: any;
    let mask_w: any;
    let mask_h: any;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      city_id = formData.get('city_id');
      name = formData.get('name') as string;
      address = (formData.get('address') as string) || '';
      mask_x = formData.get('mask_x');
      mask_y = formData.get('mask_y');
      mask_w = formData.get('mask_w');
      mask_h = formData.get('mask_h');

      // Check if a file was uploaded
      const file = formData.get('image_file') as File || formData.get('file') as File;
      if (file && typeof file !== 'string') {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Define directory to save file
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);
        image_url = `/uploads/${fileName}`;
      } else {
        // Fallback to text URL if no file uploaded
        image_url = (formData.get('image_url') as string) || '';
      }
    } else {
      // Parse JSON payload
      const body = await request.json();
      city_id = body.city_id;
      name = body.name;
      address = body.address || '';
      image_url = body.image_url || '';
      mask_x = body.mask_x;
      mask_y = body.mask_y;
      mask_w = body.mask_w;
      mask_h = body.mask_h;
    }

    if (!city_id || !name) {
      return NextResponse.json({ error: 'City ID and Name are required' }, { status: 400 });
    }

    const db = readDB();
    const cityExists = db.cities.some(c => c.id === Number(city_id));
    if (!cityExists) {
      return NextResponse.json({ error: 'Invalid City ID' }, { status: 400 });
    }

    // Coordinate Fallbacks (Fallback to 20, 15, 60, 40 if not set, or 0)
    const finalX = mask_x && Number(mask_x) > 0 ? Number(mask_x) : 20;
    const finalY = mask_y && Number(mask_y) > 0 ? Number(mask_y) : 15;
    const finalW = mask_w && Number(mask_w) > 0 ? Number(mask_w) : 60;
    const finalH = mask_h && Number(mask_h) > 0 ? Number(mask_h) : 40;

    const newId = db.venues.length > 0 ? Math.max(...db.venues.map(v => v.id)) + 1 : 1;
    const newVenue: Venue = {
      id: newId,
      city_id: Number(city_id),
      name,
      address: address || '',
      image_url: image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80',
      mask_x: finalX,
      mask_y: finalY,
      mask_w: finalW,
      mask_h: finalH
    };

    db.venues.push(newVenue);
    writeDB(db);

    return NextResponse.json(newVenue, { status: 201 });
  } catch (error: any) {
    console.error('Save venue endpoint failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
