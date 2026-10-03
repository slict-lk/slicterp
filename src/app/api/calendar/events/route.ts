import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = { tenantId };
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        organizer: { select: { name: true, email: true } },
        customer: { select: { name: true } },
        project: { select: { name: true } },
        _count: { select: { attendees: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 100,
    });

    return NextResponse.json(events);
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const data = await req.json();

    const event = await prisma.calendarEvent.create({
      data: {
        ...data,
        tenantId,
      },
      include: {
        organizer: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const data = await req.json();
    const event = await prisma.calendarEvent.update({
      where: { id },
      data,
      include: {
        organizer: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(event);
  } catch (error: any) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    await prisma.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
