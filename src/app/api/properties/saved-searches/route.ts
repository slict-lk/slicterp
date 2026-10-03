import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { savedSearchSchema } from '@/lib/validations/property';


export const dynamic = 'force-dynamic';
// Helper function for error responses
function errorResponse(message: string, status: number = 500, details?: any) {
  console.error('API Error:', { message, status, details });
  return NextResponse.json(
    { error: message, details, timestamp: new Date().toISOString() },
    { status }
  );
}

// GET /api/properties/saved-searches - Get user's saved searches
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return errorResponse('User ID is required', 400);
    }

    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: savedSearches,
      count: savedSearches.length,
    });
  } catch (error) {
    return errorResponse('Failed to fetch saved searches', 500, error);
  }
}

// POST /api/properties/saved-searches - Create saved search
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = savedSearchSchema.parse(body);

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId: validatedData.userId,
        name: validatedData.name,
        criteria: validatedData.criteria,
        emailNotifications: validatedData.emailNotifications,
        frequency: validatedData.frequency,
      },
    });

    return NextResponse.json({
      success: true,
      data: savedSearch,
      message: 'Search saved successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    return errorResponse('Failed to save search', 500, error);
  }
}

// PUT /api/properties/saved-searches - Update saved search
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const schema = savedSearchSchema.extend({
      id: z.string().min(1),
    });

    const { id, ...data } = schema.parse(body);

    const savedSearch = await prisma.savedSearch.update({
      where: { id },
      data: {
        name: data.name,
        criteria: data.criteria,
        emailNotifications: data.emailNotifications,
        frequency: data.frequency,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: savedSearch,
      message: 'Search updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    return errorResponse('Failed to update search', 500, error);
  }
}

// DELETE /api/properties/saved-searches - Delete saved search
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('Search ID is required', 400);
    }

    await prisma.savedSearch.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Search deleted successfully',
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return errorResponse('Search not found', 404);
    }
    return errorResponse('Failed to delete search', 500, error);
  }
}

