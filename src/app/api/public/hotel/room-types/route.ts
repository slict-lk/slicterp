import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/hotel/room-types?tenantId=...
 * Public endpoint that serves room category data to the hotel storefront.
 * Accepts either a tenant UUID or subdomain slug as tenantId.
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const tenantId = searchParams.get('tenantId');
        const subdomain = searchParams.get('subdomain');

        if (!tenantId && !subdomain) {
            return NextResponse.json({ error: 'Tenant ID or Subdomain required' }, { status: 400 });
        }

        // Resolve Tenant ID (Handle Slug vs UUID)
        const tenant = await prisma.tenant.findFirst({
            where: {
                OR: [
                    ...(tenantId ? [{ id: tenantId }, { subdomain: tenantId }] : []),
                    ...(subdomain ? [{ subdomain }] : []),
                ],
            },
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const resolvedTenantId = tenant.id;

        const roomTypes = await prisma.roomType.findMany({
            where: { tenantId: resolvedTenantId },
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
            orderBy: { name: 'asc' },
        });

        // Transform for frontend consumption
        const enrichedTypes = roomTypes.map(type => {
            const totalRooms = type._count.rooms;
            const availableRooms = type.rooms.filter(r => r.status === 'AVAILABLE').length;

            return {
                id: type.id,
                name: type.name,
                description: type.description,
                basePrice: type.basePrice,
                maxOccupancy: type.maxOccupancy,
                amenities: type.amenities,
                images: type.images,
                bedType: type.bedType,
                sizeSqM: type.sizeSqM,
                totalRooms,
                availableRooms,
                slug: type.name.toLowerCase().replace(/\s+/g, '-'),
                // Specific rooms with their own overrides
                roomUnits: type.rooms.map(room => ({
                    id: room.id,
                    roomNumber: room.roomNumber,
                    status: room.status,
                    floor: room.floor,
                    description: room.description || type.description,
                    images: (room.images && room.images.length > 0) ? room.images : type.images,
                })),
            };
        });

        return NextResponse.json(enrichedTypes);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
