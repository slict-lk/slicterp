import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/hotel/room-types/[id]
 * Returns a single room type with full details and room units (overrides included).
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const subdomain = searchParams.get('subdomain');

        const roomType = await prisma.roomType.findUnique({
            where: { id },
            include: {
                rooms: {
                    select: {
                        id: true,
                        roomNumber: true,
                        status: true,
                        floor: true,
                        description: true,
                        images: true,
                    },
                    orderBy: { roomNumber: 'asc' },
                },
                _count: {
                    select: { rooms: true },
                },
            },
        });

        if (!roomType) {
            return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
        }

        // If tenant identifier provided, verify it matches
        if (tenantId || subdomain) {
            const tenant = await prisma.tenant.findFirst({
                where: {
                    OR: [
                        ...(tenantId ? [{ id: tenantId }, { subdomain: tenantId }] : []),
                        ...(subdomain ? [{ subdomain }] : []),
                    ],
                },
            });

            if (!tenant || roomType.tenantId !== tenant.id) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
        }

        const totalRooms = roomType._count.rooms;
        const availableRooms = roomType.rooms.filter(r => r.status === 'AVAILABLE').length;

        const response = {
            id: roomType.id,
            name: roomType.name,
            description: roomType.description,
            basePrice: roomType.basePrice,
            maxOccupancy: roomType.maxOccupancy,
            amenities: roomType.amenities,
            images: roomType.images,
            bedType: roomType.bedType,
            sizeSqM: roomType.sizeSqM,
            totalRooms,
            availableRooms,
            slug: roomType.name.toLowerCase().replace(/\s+/g, '-'),
            roomUnits: roomType.rooms.map(room => ({
                id: room.id,
                roomNumber: room.roomNumber,
                status: room.status,
                floor: room.floor,
                description: room.description || roomType.description,
                images: (room.images && room.images.length > 0) ? room.images : roomType.images,
            })),
        };

        return NextResponse.json(response);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        console.error('Error fetching room type:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
