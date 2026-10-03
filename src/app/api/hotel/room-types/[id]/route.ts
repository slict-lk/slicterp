import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const session = await getServerSession(authOptions);
        // Auth check...

        const id = params.id;
        const body = await request.json();
        const {
            name,
            description,
            basePrice,
            maxOccupancy,
            amenities,
            images,
            bedType,
            sizeSqM,
        } = body;

        const updatedRoomType = await prisma.roomType.update({
            where: { id },
            data: {
                name,
                description,
                basePrice: parseFloat(basePrice),
                maxOccupancy: parseInt(maxOccupancy),
                amenities: amenities || [],
                images: images || [],
                bedType: bedType || null,
                sizeSqM: sizeSqM ? parseFloat(sizeSqM) : null,
            },
        });

        return NextResponse.json(updatedRoomType);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const id = params.id;

        // Check if rooms exist first?
        const count = await prisma.hotelRoom.count({ where: { roomTypeId: id } });
        if (count > 0) {
            return NextResponse.json({ error: 'Cannot delete type with existing rooms' }, { status: 400 });
        }

        await prisma.roomType.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
