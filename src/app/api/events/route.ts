import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

/**
 * GET: Lists, searches, and filters event workspaces.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const organizer = searchParams.get('organizer') || '';
    const dateStart = searchParams.get('dateStart') || '';
    const dateEnd = searchParams.get('dateEnd') || '';

    const where: any = {};

    // Filter by search text (name, tagline, description, clientName, organizerName)
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { tagline: { contains: search } },
        { description: { contains: search } },
        { clientName: { contains: search } },
        { organizerName: { contains: search } }
      ];
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by category
    if (category) {
      where.category = category;
    }

    // Filter by organizer name
    if (organizer) {
      where.organizerName = { contains: organizer };
    }

    // Filter by date bounds
    if (dateStart) {
      where.startDate = { gte: new Date(dateStart) };
    }
    if (dateEnd) {
      where.endDate = { lte: new Date(dateEnd) };
    }

    // Query events along with nested venues/halls to calculate statistics
    const events = await prisma.event.findMany({
      where,
      include: {
        venues: {
          include: {
            halls: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format events list returning venue and hall counts directly for easy card display
    const formattedEvents = events.map(e => {
      let hallCount = 0;
      e.venues.forEach(v => {
        hallCount += v.halls.length;
      });

      return {
        id: e.id,
        name: e.name,
        tagline: e.tagline,
        description: e.description,
        clientName: e.clientName,
        organizerName: e.organizerName,
        department: e.department,
        category: e.category,
        status: e.status,
        startDate: e.startDate,
        endDate: e.endDate,
        setupDate: e.setupDate,
        dismantleDate: e.dismantleDate,
        startTime: e.startTime,
        endTime: e.endTime,
        expectedVisitors: e.expectedVisitors,
        budget: e.budget,
        venueName: e.venueName,
        venueAddress: e.venueAddress,
        city: e.city,
        state: e.state,
        country: e.country,
        googleMapsUrl: e.googleMapsUrl,
        venueCount: e.venues.length,
        hallCount,
        createdAt: e.createdAt
      };
    });

    return NextResponse.json(formattedEvents);

  } catch (err: any) {
    console.error('List events API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST: Creates a new event project workspace, with optional nested venues and halls.
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name, tagline, description, clientName, organizerName, department, category, status,
      startDate, endDate, setupDate, dismantleDate, startTime, endTime,
      expectedVisitors, budget,
      venueName, venueAddress, city, state, country, googleMapsUrl,
      venues
    } = body;

    // Validation
    if (!name || !tagline || !description || !clientName || !organizerName || !category ||
        !startDate || !endDate || !setupDate || !dismantleDate || !startTime || !endTime ||
        !venueName || !venueAddress || !city || !state || !country) {
      return NextResponse.json({ error: 'Please fill in all required event details.' }, { status: 400 });
    }

    // Construct Prisma nested write payload for Venues & Halls
    const venuesData: any[] = [];

    // Always include the primary venue in venues mapping
    venuesData.push({
      name: venueName,
      address: venueAddress,
      city,
      state,
      country,
      googleMapsUrl,
      halls: {
        create: body.halls ? body.halls.map((h: any) => ({
          name: h.name,
          purpose: h.purpose || '',
          capacity: h.capacity ? parseInt(h.capacity, 10) : 0,
          floorNumber: h.floorNumber || '',
          area: h.area ? parseFloat(h.area) : 0,
          specialNotes: h.specialNotes || ''
        })) : []
      }
    });

    // Add any additional venues listed in wizard
    if (venues && Array.isArray(venues)) {
      venues.forEach((v: any) => {
        venuesData.push({
          name: v.name,
          address: v.address,
          city: v.city,
          state: v.state,
          country: v.country,
          googleMapsUrl: v.googleMapsUrl || '',
          halls: {
            create: v.halls ? v.halls.map((h: any) => ({
              name: h.name,
              purpose: h.purpose || '',
              capacity: h.capacity ? parseInt(h.capacity, 10) : 0,
              floorNumber: h.floorNumber || '',
              area: h.area ? parseFloat(h.area) : 0,
              specialNotes: h.specialNotes || ''
            })) : []
          }
        });
      });
    }

    // Insert Event with relations in transaction
    const newEvent = await prisma.event.create({
      data: {
        userId: user.id,
        name,
        tagline,
        description,
        clientName,
        organizerName,
        department: department || null,
        category,
        status: status || 'Draft',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        setupDate: new Date(setupDate),
        dismantleDate: new Date(dismantleDate),
        startTime,
        endTime,
        expectedVisitors: expectedVisitors ? parseInt(expectedVisitors, 10) : 0,
        budget: budget ? parseFloat(budget) : 0.0,
        venueName,
        venueAddress,
        city,
        state,
        country,
        googleMapsUrl: googleMapsUrl || null,
        venues: {
          create: venuesData
        }
      },
      include: {
        venues: {
          include: {
            halls: true
          }
        }
      }
    });

    return NextResponse.json(newEvent, { status: 201 });

  } catch (err: any) {
    console.error('Create event API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
