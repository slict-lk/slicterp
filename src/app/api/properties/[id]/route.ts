import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/properties/[id] - Get single property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        viewings: {
          orderBy: { scheduledAt: 'desc' },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        amenities: true,
        leases: {
          orderBy: { createdAt: 'desc' },
        },
        maintenances: {
          orderBy: { reportedAt: 'desc' },
        },
        inquiries: {
          orderBy: { createdAt: 'desc' },
        },
        agents: {
          include: {
            agent: true,
          },
        },
        _count: {
          select: {
            viewings: true,
            documents: true,
            inquiries: true,
            maintenances: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error: any) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/properties/[id] - Update property
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.propertyType !== undefined && { propertyType: body.propertyType }),
        ...(body.listingType !== undefined && { listingType: body.listingType }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.zipCode !== undefined && { zipCode: body.zipCode }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.bedrooms !== undefined && { bedrooms: body.bedrooms }),
        ...(body.bathrooms !== undefined && { bathrooms: body.bathrooms }),
        ...(body.area !== undefined && { area: body.area }),
        ...(body.yearBuilt !== undefined && { yearBuilt: body.yearBuilt }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.images !== undefined && { images: body.images }),
        ...(body.videoUrl !== undefined && { videoUrl: body.videoUrl }),
      },
    });

    return NextResponse.json(property);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/properties/[id] - Delete property
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.property.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Property deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
