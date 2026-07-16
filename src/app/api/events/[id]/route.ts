import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

/**
 * GET: Retrieves details for a single event workspace, including venues & halls.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { id } = await params;
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event workspace ID' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venues: {
          include: {
            halls: true
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event workspace not found' }, { status: 404 });
    }

    // Format stats
    let hallCount = 0;
    event.venues.forEach(v => {
      hallCount += v.halls.length;
    });

    const formattedEvent = {
      ...event,
      venueCount: event.venues.length,
      hallCount
    };

    return NextResponse.json(formattedEvent);

  } catch (err: any) {
    console.error('Fetch event detail API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT: Updates an existing event details.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { id } = await params;
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event workspace ID' }, { status: 400 });
    }

    const body = await request.json();
    const updateData: any = {};

    // Allow partial updates
    if (body.name !== undefined) updateData.name = body.name;
    if (body.tagline !== undefined) updateData.tagline = body.tagline;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.clientName !== undefined) updateData.clientName = body.clientName;
    if (body.organizerName !== undefined) updateData.organizerName = body.organizerName;
    if (body.department !== undefined) updateData.department = body.department;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.expectedVisitors !== undefined) updateData.expectedVisitors = parseInt(body.expectedVisitors, 10);
    if (body.budget !== undefined) updateData.budget = parseFloat(body.budget);

    // Timeline updates
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
    if (body.setupDate !== undefined) updateData.setupDate = new Date(body.setupDate);
    if (body.dismantleDate !== undefined) updateData.dismantleDate = new Date(body.dismantleDate);
    if (body.startTime !== undefined) updateData.startTime = body.startTime;
    if (body.endTime !== undefined) updateData.endTime = body.endTime;

    // Location updates
    if (body.venueName !== undefined) updateData.venueName = body.venueName;
    if (body.venueAddress !== undefined) updateData.venueAddress = body.venueAddress;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.googleMapsUrl !== undefined) updateData.googleMapsUrl = body.googleMapsUrl || null;

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        venues: {
          include: {
            halls: true
          }
        }
      }
    });

    return NextResponse.json(updatedEvent);

  } catch (err: any) {
    console.error('Update event API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE: Deletes an event workspace and all nested venues/halls.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { id } = await params;
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event workspace ID' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event workspace not found' }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id: eventId }
    });

    return NextResponse.json({ success: true, message: 'Event workspace deleted successfully' });

  } catch (err: any) {
    console.error('Delete event API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
