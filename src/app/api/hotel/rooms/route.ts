import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
// GET /api/hotel/rooms - List hotel rooms
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');
    const roomTypeId = searchParams.get('roomTypeId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const rooms = await prisma.hotelRoom.findMany({
      where: {
        tenantId,
        ...(status && { status: status as 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE' | 'CLEANING' }),
        ...(roomTypeId && { roomTypeId }),
      },
      include: {
        type: true,
        bookings: {
          where: {
            checkIn: { gte: new Date() },
          },
          orderBy: { checkIn: 'asc' },
          take: 3,
        },
      },
      orderBy: { roomNumber: 'asc' },
    });

    return NextResponse.json(rooms);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/hotel/rooms - Create room unit (linked to a RoomType category)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, roomNumber, roomTypeId, floor } = body;

    // Validate required fields
    if (!tenantId || !roomNumber) {
      return NextResponse.json(
        { error: 'Tenant ID and Room Number are required' },
        { status: 400 }
      );
    }

    if (!roomTypeId) {
      return NextResponse.json(
        { error: 'Room Type is required. Create a category first.' },
        { status: 400 }
      );
    }

    // Fetch the room type to populate legacy fields for backward compatibility
    const roomType = await prisma.roomType.findUnique({ where: { id: roomTypeId } });
    if (!roomType) {
      return NextResponse.json({ error: 'Room Type not found' }, { status: 404 });
    }

    const room = await prisma.hotelRoom.create({
      data: {
        tenantId,
        roomNumber,
        roomTypeId,
        floor: parseInt(floor) || 1,
        status: 'AVAILABLE',
        // Legacy fields auto-populated from category for backward compat
        roomType: roomType.name,
        basePrice: roomType.basePrice,
        maxOccupancy: roomType.maxOccupancy,
        amenities: roomType.amenities,
        images: roomType.images,
        description: roomType.description,
        bedType: roomType.bedType,
      },
      include: {
        type: true,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
