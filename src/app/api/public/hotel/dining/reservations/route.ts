import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tenantId,
            venueId,
            guestName,
            email, // Frontend sends email
            phone, // Frontend sends phone
            date,
            time,
            partySize,
            specialRequests
        } = body;

        // Map keys from frontend (email, phone) to schema (guestEmail, guestPhone)
        const guestEmail = email;
        const guestPhone = phone;

        if (!tenantId || !venueId || !guestName || !guestEmail || !date || !time || !partySize) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Generate reservation number
        const reservationNumber = `DR-${Date.now().toString(36).toUpperCase()}`;

        const reservation = await prisma.diningReservation.create({
            data: {
                tenantId,
                venueId,
                reservationNumber,
                guestName,
                guestEmail,
                guestPhone,
                date: new Date(date),
                time,
                partySize: parseInt(partySize),
                specialRequests,
                status: 'CONFIRMED'
            },
            include: {
                venue: {
                    select: { id: true, name: true }
                }
            }
        });

        return NextResponse.json(reservation, { status: 201 });
    } catch (error: any) {
        console.error('Error creating dining reservation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
