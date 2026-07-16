import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

/**
 * GET: Lists mockups for an event.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventIdStr = searchParams.get('eventId');
    if (!eventIdStr) {
      return NextResponse.json({ error: 'eventId parameter is required' }, { status: 400 });
    }

    const eventId = parseInt(eventIdStr, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const mockups = await prisma.mockup.findMany({
      where: { eventId },
      include: {
        venue: true,
        hall: true,
        versions: {
          orderBy: { versionNumber: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(mockups);

  } catch (err: any) {
    console.error('List mockups API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST: Creates a new mockup and saves Version 1.
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, eventId, venueId, hallId, stageType, category, status, designer, notes } = body;

    if (!name || !eventId || !venueId || !hallId || !stageType || !category || !designer) {
      return NextResponse.json({ error: 'Please fill in all required mockup fields.' }, { status: 400 });
    }

    // Fetch the hall details to get default baseImageUrl for Version 1
    const hall = await prisma.eventHall.findUnique({
      where: { id: parseInt(hallId, 10) }
    });
    if (!hall) {
      return NextResponse.json({ error: 'Associated EventHall not found.' }, { status: 404 });
    }

    // Fetch parent event details to auto-populate default title, subtitle, date, etc.
    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId, 10) }
    });
    const defaultTitle = event ? event.name : 'Corporate Keynote';
    const defaultSubtitle = event ? event.tagline : 'Designing the Future';
    const defaultDate = event ? new Date(event.startDate).toLocaleDateString() : '';
    const defaultVenue = event ? event.venueName : '';

    const defaultConfig = {
      title: defaultTitle,
      subtitle: defaultSubtitle,
      dateText: defaultDate,
      venueText: defaultVenue,
      footerText: 'Powered by Eventelligence',
      theme: 'dark',
      screenConfig: 'all',
      wingDisplayMode: 'mirror',
      logos: []
    };

    // Create Mockup & initial version inside transaction
    const newMockup = await prisma.mockup.create({
      data: {
        name,
        eventId: parseInt(eventId, 10),
        venueId: parseInt(venueId, 10),
        hallId: parseInt(hallId, 10),
        stageType,
        category,
        status: status || 'Draft',
        designer,
        notes: notes || '',
        versions: {
          create: {
            versionNumber: 1,
            imageUrl: '', // Blank initially, workspace will request visualization on-load
            config: JSON.stringify(defaultConfig)
          }
        }
      },
      include: {
        venue: true,
        hall: true,
        versions: true
      }
    });

    return NextResponse.json(newMockup, { status: 201 });

  } catch (err: any) {
    console.error('Create mockup API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
