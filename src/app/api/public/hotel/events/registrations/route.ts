import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tenantId,
            eventId,
            guestName,
            email,
            phone,
            attendees, // Mapping attendees to ticketCount
            specialRequests
        } = body;

        const guestEmail = email;
        const guestPhone = phone;
        const ticketCount = attendees;

        if (!tenantId || !eventId || !guestName || !guestEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get event price
        const event = await prisma.hotelEvent.findUnique({
            where: { id: eventId },
            select: { price: true, capacity: true, _count: { select: { registrations: true } } }
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Check capacity
        const numTickets = parseInt(ticketCount) || 1;
        if (event.capacity && (event._count.registrations + numTickets) > event.capacity) {
            return NextResponse.json({ error: 'Event is fully booked' }, { status: 400 });
        }

        const totalAmount = (event.price || 0) * numTickets;
        const ticketNumber = `EVT-${Date.now().toString(36).toUpperCase()}`;

        const registration = await prisma.hotelEventRegistration.create({
            data: {
                tenantId,
                eventId,
                ticketNumber,
                guestName,
                guestEmail,
                guestPhone,
                ticketCount: numTickets,
                totalAmount,
                status: 'CONFIRMED'
            },
            include: {
                event: {
                    select: { id: true, title: true, date: true, time: true, location: true }
                }
            }
        });

        return NextResponse.json(registration, { status: 201 });
    } catch (error: any) {
        console.error('Error creating event registration:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
