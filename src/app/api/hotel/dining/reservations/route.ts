import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/hotel/dining/reservations - List reservations
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const venueId = searchParams.get('venueId');
        const date = searchParams.get('date');
        const status = searchParams.get('status');

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
        }

        const where: any = { tenantId };
        if (venueId) where.venueId = venueId;
        if (status) where.status = status;
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            where.date = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        const reservations = await prisma.diningReservation.findMany({
            where,
            include: {
                venue: {
                    select: { id: true, name: true }
                }
            },
            orderBy: [
                { date: 'asc' },
                { time: 'asc' }
            ],
        });

        return NextResponse.json(reservations);
    } catch (error: any) {
        console.error('Error fetching dining reservations:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/hotel/dining/reservations - Create reservation (public)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tenantId,
            venueId,
            guestName,
            guestEmail,
            guestPhone,
            date,
            time,
            partySize,
            specialRequests
        } = body;

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
