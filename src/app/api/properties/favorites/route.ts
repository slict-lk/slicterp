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

// GET /api/properties/favorites - Get user's favorite properties
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return errorResponse('User ID is required', 400);
    }

    const favorites = await prisma.propertyFavorite.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            amenities: {
              select: {
                id: true,
                name: true,
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
            _count: {
              select: {
                favorites: true,
                views: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: favorites,
      count: favorites.length,
    });
  } catch (error) {
    return errorResponse('Failed to fetch favorites', 500, error);
  }
}

// POST /api/properties/favorites - Add property to favorites
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const schema = z.object({
      userId: z.string().min(1),
      propertyId: z.string().min(1),
    });

    const { userId, propertyId } = schema.parse(body);

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return errorResponse('Property not found', 404);
    }

    // Check if already favorited
    const existing = await prisma.propertyFavorite.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    if (existing) {
      return errorResponse('Property already in favorites', 409);
    }

    const favorite = await prisma.propertyFavorite.create({
      data: {
        userId,
        propertyId,
      },
      include: {
        property: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: favorite,
      message: 'Property added to favorites',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    return errorResponse('Failed to add favorite', 500, error);
  }
}

// DELETE /api/properties/favorites - Remove property from favorites
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const propertyId = searchParams.get('propertyId');

    if (!userId || !propertyId) {
      return errorResponse('User ID and Property ID are required', 400);
    }

    await prisma.propertyFavorite.delete({
      where: {
        userId_propertyId: {
          userId,
          propertyId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Property removed from favorites',
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return errorResponse('Favorite not found', 404);
    }
    return errorResponse('Failed to remove favorite', 500, error);
  }
}

