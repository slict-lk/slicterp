import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { virtualTourSchema } from '@/lib/validations/property';


export const dynamic = 'force-dynamic';
// Helper function for error responses
function errorResponse(message: string, status: number = 500, details?: any) {
  console.error('API Error:', { message, status, details });
  return NextResponse.json(
    { error: message, details, timestamp: new Date().toISOString() },
    { status }
  );
}

// GET /api/properties/virtual-tours - Get virtual tours for a property
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return errorResponse('Property ID is required', 400);
    }

    const virtualTours = await prisma.virtualTour.findMany({
      where: {


      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: virtualTours,
      count: virtualTours.length,
    });
  } catch (error) {
    return errorResponse('Failed to fetch virtual tours', 500, error);
  }
}

// POST /api/properties/virtual-tours - Create virtual tour
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = virtualTourSchema.parse(body);

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: validatedData.propertyId },
    });

    if (!property) {
      return errorResponse('Property not found', 404);
    }

    const virtualTour = await prisma.virtualTour.create({
      data: {
        propertyId: validatedData.propertyId,
        title: validatedData.title,
        description: validatedData.description,
        tourType: validatedData.tourType,
        url: validatedData.url,
        embedCode: validatedData.embedCode,
        images: validatedData.images,
        thumbnail: validatedData.thumbnail,
      },
    });

    return NextResponse.json({
      success: true,
      data: virtualTour,
      message: 'Virtual tour created successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    return errorResponse('Failed to create virtual tour', 500, error);
  }
}

// PUT /api/properties/virtual-tours - Update virtual tour
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const schema = virtualTourSchema.extend({
      id: z.string().min(1),
    });

    const { id, ...data } = schema.parse(body);

    const virtualTour = await prisma.virtualTour.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        tourType: data.tourType,
        url: data.url,
        embedCode: data.embedCode,
        images: data.images,
        thumbnail: data.thumbnail,
      },
    });

    return NextResponse.json({
      success: true,
      data: virtualTour,
      message: 'Virtual tour updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    return errorResponse('Failed to update virtual tour', 500, error);
  }
}

// DELETE /api/properties/virtual-tours - Delete virtual tour
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('Virtual tour ID is required', 400);
    }

    await prisma.virtualTour.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Virtual tour deleted successfully',
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return errorResponse('Virtual tour not found', 404);
    }
    return errorResponse('Failed to delete virtual tour', 500, error);
  }
}

// PATCH /api/properties/virtual-tours/view - Increment view count
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const schema = z.object({
      id: z.string().min(1),
    });

    const { id } = schema.parse(body);

    const virtualTour = await prisma.virtualTour.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: virtualTour,
    });
  } catch (error) {
    return errorResponse('Failed to update view count', 500, error);
  }
}

