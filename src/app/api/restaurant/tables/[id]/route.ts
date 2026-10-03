import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/restaurant/tables/[id] - Get table details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = prisma as any;
    const table = await client.restaurantTable.findUnique({
      where: { id },
      include: {
        reservations: {
          orderBy: { reservationDate: 'asc' },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json(table);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/restaurant/tables/[id] - Update table
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const client = prisma as any;

    const table = await client.restaurantTable.update({
      where: { id },
      data: {
        ...(body.tableNumber !== undefined && { tableNumber: body.tableNumber }),
        ...(body.capacity !== undefined && { capacity: body.capacity }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    return NextResponse.json(table);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/restaurant/tables/[id] - Delete table
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = prisma as any;
    await client.restaurantTable.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Table deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
