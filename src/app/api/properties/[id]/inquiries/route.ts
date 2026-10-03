import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/properties/[id]/inquiries - Submit an inquiry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'email', 'message'];
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

    const inquiry = await prisma.propertyInquiry.create({
      data: {
        propertyId: id,
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        message: body.message,
        status: body.status || 'NEW',
      },
    });

    return NextResponse.json(inquiry, { status: 201 });
  } catch (error: any) {
    console.error('Error creating inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to create inquiry', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/properties/[id]/inquiries - Get all inquiries for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const inquiries = await prisma.propertyInquiry.findMany({
      where: {
        propertyId: id,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(inquiries);
  } catch (error: any) {
    console.error('Error fetching inquiries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inquiries', details: error.message },
      { status: 500 }
    );
  }
}

