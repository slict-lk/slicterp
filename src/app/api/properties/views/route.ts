import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { propertyViewTrackingSchema } from '@/lib/validations/property';


export const dynamic = 'force-dynamic';
// Helper function for error responses
function errorResponse(message: string, status: number = 500, details?: any) {
  console.error('API Error:', { message, status, details });
  return NextResponse.json(
    { error: message, details, timestamp: new Date().toISOString() },
    { status }
  );
}

// GET /api/properties/views - Get view statistics for a property
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('propertyId');
    const days = parseInt(searchParams.get('days') || '30');

    if (!propertyId) {
      return errorResponse('Property ID is required', 400);
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalViews, recentViews, uniqueUsers, viewsBySource] = await Promise.all([
      // Total views count
      prisma.propertyView.count({
        where: { propertyId },
      }),

      // Recent views with time filter
      prisma.propertyView.count({
        where: {
          propertyId,
          viewedAt: {
            gte: since,
          },
        },
      }),

      // Unique users count (excluding null userIds)
      prisma.propertyView.groupBy({
        by: ['userId'],
        where: {
          propertyId,
          userId: {
            not: null,
          },
        },
      }),

      // Views grouped by source
      prisma.propertyView.groupBy({
        by: ['source'],
        where: { propertyId },
        _count: true,
      }),
    ]);

    // Get daily views for the period
    const dailyViews = await prisma.$queryRaw`
      SELECT DATE(viewed_at) as date, COUNT(*) as count
      FROM "PropertyView"
      WHERE property_id = ${propertyId}
      AND viewed_at >= ${since}
      GROUP BY DATE(viewed_at)
      ORDER BY date DESC
    `;

    return NextResponse.json({
      success: true,
      data: {
        totalViews,
        recentViews,
        uniqueUsers: uniqueUsers.length,
        viewsBySource: viewsBySource.map(v => ({
          source: v.source || 'UNKNOWN',
          count: v._count,
        })),
        dailyViews,
        period: `Last ${days} days`,
      },
    });
  } catch (error) {
    return errorResponse('Failed to fetch view statistics', 500, error);
  }
}

// POST /api/properties/views - Track a property view
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = propertyViewTrackingSchema.parse(body);

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: validatedData.propertyId },
    });

    if (!property) {
      return errorResponse('Property not found', 404);
    }

    // Create view record
    const view = await prisma.propertyView.create({
      data: {
        propertyId: validatedData.propertyId,
        userId: validatedData.userId,
        ipAddress: validatedData.ipAddress,
        userAgent: validatedData.userAgent,
        source: validatedData.source,
        referrer: validatedData.referrer,
        sessionId: validatedData.sessionId,
        duration: validatedData.duration,
      },
    });

    // Increment property view count
    await prisma.property.update({
      where: { id: validatedData.propertyId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: view,
      message: 'View tracked successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    return errorResponse('Failed to track view', 500, error);
  }
}

