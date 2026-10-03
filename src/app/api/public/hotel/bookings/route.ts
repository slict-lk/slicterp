import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { differenceInDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tenantId,
            roomId, // Can be RoomID OR missing if roomTypeId is provided
            roomTypeId, // NEW: Support booking by Type
            rateName,
            price,
            guestName,
            guestEmail,
            checkIn,
            checkOut,
            guests
        } = body;

        // 1. Basic Validation
        if (!tenantId || (!roomId && !roomTypeId) || !rateName || price === undefined || !guestName || !checkIn || !checkOut) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Resolve Tenant ID (Handle Slug vs UUID)
        const tenant = await prisma.tenant.findFirst({
            where: {
                OR: [
                    { id: tenantId },
                    { subdomain: tenantId }
                ]
            }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const resolvedTenantId = tenant.id;

        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        const lengthOfStay = differenceInDays(endDate, startDate);

        if (lengthOfStay <= 0) return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });

        let assignedRoomId = roomId;
        let basePrice = 0;

        // 2. Resolve Room (Room ID vs Room Type ID)
        if (roomTypeId && !roomId) {
            // BOOKING BY TYPE: Find an available room of this type

            // First, get type details for price validation
            const roomType = await (prisma as any).roomType.findUnique({
                where: { id: roomTypeId }
            });

            // If passed ID is actually a legacy Room ID (fallback check)
            if (!roomType) {
                const fallbackRoom = await prisma.hotelRoom.findUnique({ where: { id: roomTypeId } });
                if (fallbackRoom) {
                    assignedRoomId = fallbackRoom.id;
                    basePrice = fallbackRoom.basePrice || 0; // Legacy
                } else {
                    return NextResponse.json({ error: 'Room Type not found' }, { status: 404 });
                }
            } else {
                basePrice = roomType.basePrice;

                // Find available room
                // Get all rooms of this type
                const candidateRooms = await prisma.hotelRoom.findMany({
                    where: {
                        tenantId: resolvedTenantId,
                        // @ts-ignore
                        OR: [{ roomTypeId }, { roomType: roomType.name }], // Handle legacy link
                        status: 'AVAILABLE'
                    }
                });

                // Check conflicts
                const existingBookings = await prisma.hotelBooking.findMany({
                    where: {
                        roomId: { in: candidateRooms.map(r => r.id) },
                        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                        AND: [{ checkIn: { lt: endDate } }, { checkOut: { gt: startDate } }]
                    },
                    select: { roomId: true }
                });

                const bookedIds = new Set(existingBookings.map(b => b.roomId));
                const availableCandidate = candidateRooms.find(r => !bookedIds.has(r.id));

                if (!availableCandidate) {
                    return NextResponse.json({ error: 'Sorry, no rooms of this type are available for your selected dates.' }, { status: 409 });
                }
                assignedRoomId = availableCandidate.id;
            }
        } else {
            // DIRECT ROOM BOOKING (Legacy or specific room selection)
            const room = await prisma.hotelRoom.findUnique({ where: { id: roomId } });
            if (!room || room.tenantId !== resolvedTenantId) {
                return NextResponse.json({ error: 'Room not found' }, { status: 404 });
            }
            assignedRoomId = room.id;
            // Use Type price if linked, else legacy basePrice
            // @ts-ignore
            if (room.roomTypeId) {
                // @ts-ignore
                const type = await (prisma as any).roomType.findUnique({ where: { id: room.roomTypeId } });
                basePrice = type?.basePrice || room.basePrice || 0;
            } else {
                basePrice = room.basePrice || 0;
            }
        }

        // 3. RE-VERIFY PRICE
        const totalStandardPrice = basePrice * lengthOfStay;
        let expectedPrice = totalStandardPrice;

        if (rateName.includes('Member Rate')) {
            expectedPrice = Math.round(totalStandardPrice * 0.85);
        } else if (rateName === 'Flexible Rate') {
            expectedPrice = totalStandardPrice;
        } else {
            // Unknown rate plan
            return NextResponse.json(
                { error: 'Invalid Rate Plan selected' },
                { status: 400 }
            );
        }

        // Tolerance for price mismatch (1.0)
        if (Math.abs(expectedPrice - price) > 1.0) {
            // Optional: Fail or Just Warn? For now, we update to correct price or fail?
            // Let's fail safety
            return NextResponse.json({ error: `Price mismatch. Expected ${expectedPrice} but got ${price}` }, { status: 400 });
        }

        // 4. Double Check Availability (Concurrency safety for assigned room)
        const doubleBookCheck = await prisma.hotelBooking.findFirst({
            where: {
                roomId: assignedRoomId,
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                AND: [{ checkIn: { lt: endDate } }, { checkOut: { gt: startDate } }]
            }
        });

        if (doubleBookCheck) {
            return NextResponse.json({ error: 'Room was just booked by another user. Please try again.' }, { status: 409 });
        }

        // 5. Create Booking
        const bookingNumber = `BK-${Date.now().toString().slice(-6)}`;
        const newBooking = await prisma.hotelBooking.create({
            data: {
                tenantId: resolvedTenantId,
                roomId: assignedRoomId,
                bookingNumber,
                guestName,
                guestEmail,
                guestPhone: body.guestPhone || '', // Add phone support
                checkIn: startDate,
                checkOut: endDate,
                nights: lengthOfStay,
                guests: guests || 1,
                totalAmount: expectedPrice,
                status: 'CONFIRMED',
                specialRequests: body.specialRequests || `Rate Plan: ${rateName}`,
            },
        });

        return NextResponse.json({
            bookingNumber: newBooking.bookingNumber,
            status: newBooking.status,
            message: 'Booking confirmed successfully'
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating booking:', error);
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }
}
