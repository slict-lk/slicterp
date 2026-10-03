import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const roomId = searchParams.get('roomId');
        const status = searchParams.get('status');

        if (!tenantId) {
            // In a real app we'd get tenant from session, but for now allow param
            // or if authenticated via middleware, we might need to extract it differently.
            // Assuming param for consistency with other internal APIs
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
        }

        const where: any = { tenantId };
        if (roomId) where.roomId = roomId;
        if (status) where.status = status;


        const bookings = await prisma.hotelBooking.findMany({
            where,
            include: {
                room: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(bookings);
    } catch (error: any) {
        console.error('Error fetching bookings:', error);
        return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tenantId,
            roomId,
            guestName,
            guestEmail,
            guestPhone,
            checkIn,
            checkOut,
            totalAmount,
            depositAmount,
            status
        } = body;

        // Basic validation
        if (!tenantId || !roomId || !guestName || !checkIn || !checkOut) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Calculate nights
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json({ error: 'Invalid check-in or check-out date' }, { status: 400 });
        }
        if (end <= start) {
            return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 });
        }
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

        // Create the booking
        const booking = await prisma.hotelBooking.create({
            data: {
                tenantId,
                bookingNumber: `BK-${Date.now().toString().slice(-6)}`,
                // Use connect for relation
                room: { connect: { id: roomId } },
                guestName,
                guestEmail: guestEmail || '',
                guestPhone,
                checkIn: start,
                checkOut: end,
                nights: diffDays,
                totalAmount: Number.isFinite(Number(totalAmount)) ? Number(totalAmount) : 0,
                status: status || 'CONFIRMED',
                depositAmount: Number.isFinite(Number(depositAmount)) ? Number(depositAmount) : 0,
                guests: 1, // Default
            },
            include: {
                room: true
            }
        });

        return NextResponse.json(booking);
    } catch (error: any) {
        console.error('Error creating booking:', error);
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }
}
