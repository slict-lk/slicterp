import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { neighborhoodInsightSchema } from '@/lib/validations/property';


export const dynamic = 'force-dynamic';
// Helper function for error responses
function errorResponse(message: string, status: number = 500, details?: any) {
  console.error('API Error:', { message, status, details });
  return NextResponse.json(
    { error: message, details, timestamp: new Date().toISOString() },
    { status }
  );
}

// GET /api/properties/neighborhood - Get neighborhood insights for a property
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return errorResponse('Property ID is required', 400);
    }

    const neighborhood = await prisma.neighborhoodInsight.findUnique({
      where: { propertyId },
    });

    if (!neighborhood) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No neighborhood insights available for this property',
      });
    }

    return NextResponse.json({
      success: true,
      data: neighborhood,
    });
  } catch (error) {
    return errorResponse('Failed to fetch neighborhood insights', 500, error);
  }
}

// POST /api/properties/neighborhood - Create neighborhood insights
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = neighborhoodInsightSchema.parse(body);

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: validatedData.propertyId },
    });

    if (!property) {
      return errorResponse('Property not found', 404);
    }

    // Check if neighborhood insights already exist
    const existing = await prisma.neighborhoodInsight.findUnique({
      where: { propertyId: validatedData.propertyId },
    });

    if (existing) {
      return errorResponse('Neighborhood insights already exist for this property', 409);
    }

    const neighborhood = await prisma.neighborhoodInsight.create({
      data: {
        propertyId: validatedData.propertyId,
        walkScore: validatedData.walkScore,
        transitScore: validatedData.transitScore,
        bikeScore: validatedData.bikeScore,
        medianIncome: validatedData.medianIncome,
        populationCount: validatedData.populationCount,
        medianAge: validatedData.medianAge,
        crimeRate: validatedData.crimeRate,
        schools: validatedData.schools,
        amenities: validatedData.amenities,
        pointsOfInterest: validatedData.pointsOfInterest,
        publicTransport: validatedData.publicTransport,
        additionalData: validatedData.additionalData,
      },
    });

    return NextResponse.json({
      success: true,
      data: neighborhood,
      message: 'Neighborhood insights created successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    return errorResponse('Failed to create neighborhood insights', 500, error);
  }
}

// PUT /api/properties/neighborhood - Update neighborhood insights
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = neighborhoodInsightSchema.parse(body);

    const neighborhood = await prisma.neighborhoodInsight.update({
      where: { propertyId: validatedData.propertyId },
      data: {
        walkScore: validatedData.walkScore,
        transitScore: validatedData.transitScore,
        bikeScore: validatedData.bikeScore,
        medianIncome: validatedData.medianIncome,
        populationCount: validatedData.populationCount,
        medianAge: validatedData.medianAge,
        crimeRate: validatedData.crimeRate,
        schools: validatedData.schools,
        amenities: validatedData.amenities,
        pointsOfInterest: validatedData.pointsOfInterest,
        publicTransport: validatedData.publicTransport,
        additionalData: validatedData.additionalData,
        lastUpdated: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: neighborhood,
      message: 'Neighborhood insights updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return errorResponse('Neighborhood insights not found', 404);
    }
    return errorResponse('Failed to update neighborhood insights', 500, error);
  }
}

// DELETE /api/properties/neighborhood - Delete neighborhood insights
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return errorResponse('Property ID is required', 400);
    }

    await prisma.neighborhoodInsight.delete({
      where: { propertyId },
    });

    return NextResponse.json({
      success: true,
      message: 'Neighborhood insights deleted successfully',
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return errorResponse('Neighborhood insights not found', 404);
    }
    return errorResponse('Failed to delete neighborhood insights', 500, error);
  }
}

