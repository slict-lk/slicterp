import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';


export const dynamic = 'force-dynamic';
// Helper function for error responses
function errorResponse(message: string, status: number = 500, details?: any) {
  console.error('API Error:', { message, status, details });
  return NextResponse.json(
    { error: message, details, timestamp: new Date().toISOString() },
    { status }
  );
}

// GET /api/properties/compare - Get properties for comparison
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const propertyIds = searchParams.get('propertyIds')?.split(',').filter(Boolean) || [];

    if (propertyIds.length === 0) {
      return errorResponse('At least one property ID is required', 400);
    }

    if (propertyIds.length > 5) {
      return errorResponse('Maximum 5 properties can be compared at once', 400);
    }

    const properties = await prisma.property.findMany({
      where: {
        id: {
          in: propertyIds,
        },
      },
      include: {
        amenities: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        agents: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        virtualTours: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            tourType: true,
          },
        },
        neighborhood: true,
        _count: {
          select: {
            favorites: true,
            views: true,
            inquiries: true,
          },
        },
      },
    });

    // Generate comparison matrix
    const comparison = {
      properties,
      comparison: {
        price: properties.map(p => ({ id: p.id, value: p.price })),
        bedrooms: properties.map(p => ({ id: p.id, value: p.bedrooms })),
        bathrooms: properties.map(p => ({ id: p.id, value: p.bathrooms })),
        area: properties.map(p => ({ id: p.id, value: p.area })),
        amenitiesCount: properties.map(p => ({ id: p.id, value: p.amenities.length })),
        walkScore: properties.map(p => ({
          id: p.id,
          value: p.neighborhood?.walkScore || null
        })),
        viewCount: properties.map(p => ({ id: p.id, value: p.viewCount })),
        favoritesCount: properties.map(p => ({ id: p.id, value: p._count.favorites })),
      },
    };

    return NextResponse.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    return errorResponse('Failed to compare properties', 500, error);
  }
}

// POST /api/properties/compare - Save a property comparison
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const schema = z.object({
      userId: z.string().min(1),
      propertyIds: z.array(z.string()).min(2).max(5),
    });

    const { userId, propertyIds } = schema.parse(body);

    // Verify all properties exist
    const properties = await prisma.property.findMany({
      where: {
        id: {
          in: propertyIds,
        },
      },
    });

    if (properties.length !== propertyIds.length) {
      return errorResponse('One or more properties not found', 404);
    }

    const comparison = await prisma.propertyComparison.create({
      data: {
        userId,
        propertyIds,
      },
    });

    return NextResponse.json({
      success: true,
      data: comparison,
      message: 'Comparison saved successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    return errorResponse('Failed to save comparison', 500, error);
  }
}

// DELETE /api/properties/compare - Delete a saved comparison
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('Comparison ID is required', 400);
    }

    await prisma.propertyComparison.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Comparison deleted successfully',
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return errorResponse('Comparison not found', 404);
    }
    return errorResponse('Failed to delete comparison', 500, error);
  }
}

