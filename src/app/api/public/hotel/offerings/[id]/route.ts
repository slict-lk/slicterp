import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Try to find Room Type first (Preferred for new architecture)
        const roomType = await (prisma as any).roomType.findUnique({
            where: { id }
        });

        if (roomType) {
            return NextResponse.json({
                id: roomType.id,
                name: roomType.name,
                description: roomType.description,
                price: roomType.basePrice,
                images: roomType.images,
                maxOccupancy: roomType.maxOccupancy,
                type: 'ROOM_TYPE'
            });
        }

        // 2. Fallback to specific Room
        const room = await prisma.hotelRoom.findUnique({
            where: { id },
            include: { type: true } // Try to get type details if available
        });

        if (room) {
            // @ts-ignore
            const typeInfo = room.type;
            return NextResponse.json({
                id: room.id,
                name: typeInfo?.name || room.roomType || `Room ${room.roomNumber}`,
                description: typeInfo?.description || room.description || '',
                price: typeInfo?.basePrice || room.basePrice,
                images: typeInfo?.images?.length ? typeInfo.images : room.images,
                maxOccupancy: typeInfo?.maxOccupancy || room.maxOccupancy,
                type: 'ROOM',
                number: room.roomNumber
            });
        }

        return NextResponse.json({ error: 'Offering not found' }, { status: 404 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
