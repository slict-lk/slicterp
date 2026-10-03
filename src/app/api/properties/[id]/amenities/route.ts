import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/properties/[id]/amenities - Add an amenity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Amenity name is required' },
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

    const amenity = await prisma.propertyAmenity.create({
      data: {
        propertyId: id,
        name: body.name,
        description: body.description || null,
      },
    });

    return NextResponse.json(amenity, { status: 201 });
  } catch (error: any) {
    console.error('Error adding amenity:', error);
    return NextResponse.json(
      { error: 'Failed to add amenity', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/properties/[id]/amenities - Get all amenities for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const amenities = await prisma.propertyAmenity.findMany({
      where: {
        propertyId: id,
      },
    });

    return NextResponse.json(amenities);
  } catch (error: any) {
    console.error('Error fetching amenities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch amenities', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/properties/[id]/amenities - Delete an amenity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const amenityId = searchParams.get('amenityId');

    if (!amenityId) {
      return NextResponse.json(
        { error: 'Amenity ID is required' },
        { status: 400 }
      );
    }

    await prisma.propertyAmenity.delete({
      where: { id: amenityId },
    });

    return NextResponse.json({ message: 'Amenity deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting amenity:', error);
    return NextResponse.json(
      { error: 'Failed to delete amenity', details: error.message },
      { status: 500 }
    );
  }
}
