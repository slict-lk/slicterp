import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays, differenceInDays } from 'date-fns';

export const dynamic = 'force-dynamic';

// ... imports

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const branchId = searchParams.get('branchId');
        const checkIn = searchParams.get('checkIn');
        const checkOut = searchParams.get('checkOut');
        const guests = parseInt(searchParams.get('guests') || '1');

        if (!tenantId || !checkIn || !checkOut) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
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

        // 1. Find matched rooms (available status, capacity)
        // 1. Find matched rooms (available status, capacity)
        const roomFilter: any = {
            tenantId: resolvedTenantId,
            maxOccupancy: { gte: guests },
            status: 'AVAILABLE',
        };
        if (branchId) roomFilter.branchId = branchId;

        // Fetch rooms with their Type data
        const allRooms = await prisma.hotelRoom.findMany({
            where: roomFilter,
            include: { type: true }
        });

        // 2. Find overlapping bookings
        const existingBookings = await prisma.hotelBooking.findMany({
            where: {
                tenantId: resolvedTenantId,
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                AND: [
                    { checkIn: { lt: endDate } },
                    { checkOut: { gt: startDate } },
                ],
            },
            select: { roomId: true },
        });

        const bookedRoomIds = new Set(existingBookings.map((b) => b.roomId));

        // 3. Filter available rooms
        const availableRooms = allRooms.filter((room) => !bookedRoomIds.has(room.id));

        // 4. GROUP BY Room Type
        const groupedByType = new Map<string, {
            typeId: string,
            name: string,
            description: string,
            images: string[],
            amenities: string[],
            basePrice: number,
            maxOccupancy: number,
            availableRooms: any[]
        }>();

        for (const room of availableRooms) {
            // Determine key (TypeId or Name)
            // Use Type ID if connected, else fallback to Name
            const typeId = room.roomTypeId || room.roomType || 'Standard';
            const typeName = room.type?.name || room.roomType || 'Standard';

            if (!groupedByType.has(typeId)) {
                // Initialize group
                groupedByType.set(typeId, {
                    typeId: room.roomTypeId || 'legacy', // If legacy, we can't really book by type ID easily unless we use name
                    name: typeName,
                    description: room.type?.description || room.description || '',
                    images: (room.type?.images?.length ? room.type.images : room.images) || [],
                    amenities: (room.type?.amenities?.length ? room.type.amenities : room.amenities) || [],
                    basePrice: room.type?.basePrice || room.basePrice || 0,
                    maxOccupancy: room.type?.maxOccupancy || room.maxOccupancy || 2,
                    availableRooms: []
                });
            }
            groupedByType.get(typeId)?.availableRooms.push(room);
        }

        // 5. Construct Response
        const results = Array.from(groupedByType.values()).map(group => {
            const totalStandardPrice = group.basePrice * lengthOfStay;

            // Rate Plans (Same logic as before)
            const standardRate = {
                name: 'Flexible Rate',
                price: totalStandardPrice,
                strikePrice: Math.round(totalStandardPrice * 1.1),
                isMember: false,
                perks: ['Free cancellation', 'Pay at hotel'],
            };

            const memberPrice = Math.round(totalStandardPrice * 0.85);
            const memberRate = {
                name: 'Member Rate',
                price: memberPrice,
                strikePrice: totalStandardPrice,
                isMember: true,
                perks: ['Save 15%', 'Late Checkout'],
            };

            return {
                id: group.typeId === 'legacy' ? group.availableRooms[0].id : group.typeId, // If Type, use TypeID. If legacy, use first RoomID (fallback)
                isType: group.typeId !== 'legacy',
                roomType: group.name,
                description: group.description,
                maxOccupancy: group.maxOccupancy,
                images: group.images.length > 0 ? group.images : ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop'],
                amenities: group.amenities,
                availableCount: group.availableRooms.length,
                rates: [memberRate, standardRate],
            };
        });

        return NextResponse.json(results);

    } catch (error: any) {
        console.error('Error fetching public rooms:', error);
        return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }
}
