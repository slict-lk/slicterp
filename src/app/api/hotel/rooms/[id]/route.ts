import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/hotel/rooms/[id] - Get room details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const room = await prisma.hotelRoom.findUnique({
      where: { id },
      include: {
        type: true,
        bookings: {
          orderBy: { checkIn: 'asc' },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/hotel/rooms/[id] - Update room (operational fields only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const room = await prisma.hotelRoom.update({
      where: { id },
      data: {
        ...(body.roomNumber !== undefined && { roomNumber: body.roomNumber }),
        ...(body.floor !== undefined && { floor: body.floor }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.roomTypeId !== undefined && { roomTypeId: body.roomTypeId }),
      },
      include: {
        type: true,
      },
    });

    return NextResponse.json(room);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/hotel/rooms/[id] - Delete room
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.hotelRoom.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Room deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
