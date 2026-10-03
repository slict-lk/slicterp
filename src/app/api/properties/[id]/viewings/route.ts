import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/properties/[id]/viewings - Schedule a viewing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['clientName', 'clientEmail', 'scheduledAt'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const viewing = await prisma.propertyViewing.create({
      data: {
        propertyId: id,
        clientName: body.clientName,
        clientEmail: body.clientEmail,
        clientPhone: body.clientPhone || null,
        scheduledAt: new Date(body.scheduledAt),
        notes: body.notes || null,
        status: body.status || 'SCHEDULED',
      },
    });

    return NextResponse.json(viewing, { status: 201 });
  } catch (error: any) {
    console.error('Error creating viewing:', error);
    return NextResponse.json(
      { error: 'Failed to create viewing', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/properties/[id]/viewings - Get all viewings for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const viewings = await prisma.propertyViewing.findMany({
      where: {
        propertyId: id,
        ...(status && { status }),
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return NextResponse.json(viewings);
  } catch (error: any) {
    console.error('Error fetching viewings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch viewings', details: error.message },
      { status: 500 }
    );
  }
}
