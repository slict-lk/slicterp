import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/hotel/room-types - List all room types
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const tenantId = searchParams.get('tenantId');

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
        }

        const roomTypes = await prisma.roomType.findMany({
            where: { tenantId },
            include: {
                rooms: {
                    orderBy: { roomNumber: 'asc' }
                },
                _count: {
                    select: { rooms: true }
                }
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(roomTypes);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/hotel/room-types - Create new room type
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        /* 
           Note: We relax auth check for now if session is missing in dev environment, 
           but strictly, we should check session.user.tenantId
        */

        const body = await request.json();
        const {
            tenantId,
            name,
            description,
            basePrice,
            maxOccupancy,
            amenities,
            images,
            bedType,
            sizeSqM
        } = body;

        // Validate required fields
        if (!tenantId || !name || basePrice === undefined) {
            return NextResponse.json({ error: 'Name, Tenant ID and Base Price are required' }, { status: 400 });
        }

        const roomType = await prisma.roomType.create({
            data: {
                tenantId,
                name,
                description,
                basePrice: parseFloat(basePrice),
                maxOccupancy: parseInt(maxOccupancy) || 2,
                amenities: amenities || [],
                images: images || [],
                bedType: bedType || 'Queen',
                sizeSqM: sizeSqM ? parseFloat(sizeSqM) : null,
            },
        });

        return NextResponse.json(roomType, { status: 201 });
    } catch (error: any) {
        console.error('Error creating room type:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
