import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/hotel/experiences/bookings - List experience bookings
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const experienceId = searchParams.get('experienceId');
        const date = searchParams.get('date');
        const status = searchParams.get('status');

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
        }

        const where: any = { tenantId };
        if (experienceId) where.experienceId = experienceId;
        if (status) where.status = status;
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            where.date = { gte: startOfDay, lte: endOfDay };
        }

        const bookings = await prisma.experienceBooking.findMany({
            where,
            include: {
                experience: {
                    select: { id: true, name: true, category: true, price: true }
                }
            },
            orderBy: { date: 'asc' },
        });

        return NextResponse.json(bookings);
    } catch (error: any) {
        console.error('Error fetching experience bookings:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/hotel/experiences/bookings - Create booking (public)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tenantId,
            experienceId,
            guestName,
            guestEmail,
            guestPhone,
            date,
            time,
            participants,
            specialRequests
        } = body;

        if (!tenantId || !experienceId || !guestName || !guestEmail || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get experience price
        const experience = await prisma.experience.findUnique({
            where: { id: experienceId },
            select: { price: true }
        });

        const numParticipants = parseInt(participants) || 1;
        const totalAmount = (experience?.price || 0) * numParticipants;

        const bookingNumber = `EXP-${Date.now().toString(36).toUpperCase()}`;

        const booking = await prisma.experienceBooking.create({
            data: {
                tenantId,
                experienceId,
                bookingNumber,
                guestName,
                guestEmail,
                guestPhone,
                date: new Date(date),
                time,
                participants: numParticipants,
                totalAmount,
                specialRequests,
                status: 'CONFIRMED'
            },
            include: {
                experience: {
                    select: { id: true, name: true, category: true }
                }
            }
        });

        return NextResponse.json(booking, { status: 201 });
    } catch (error: any) {
        console.error('Error creating experience booking:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
