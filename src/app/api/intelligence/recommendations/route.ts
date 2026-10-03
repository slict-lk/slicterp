import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import {
  getIntelligenceRecommendations,
  updateRecommendationStatus,
} from '@/lib/intelligence/recommendations/recommendation-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    await requireAnyPermission([{ moduleId: 'intelligence', action: 'view' }, { moduleId: 'ai', action: 'view' }]);

    const data = await getIntelligenceRecommendations(prisma, tenant.id);

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
        },
        ...data,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    const user = await requireAnyPermission([{ moduleId: 'intelligence', action: 'approve' }, { moduleId: 'ai', action: 'approve' }]);

    const body = await request.json();
    if (!body?.recommendationId || !body?.status) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'recommendationId and status are required',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    await updateRecommendationStatus(prisma, tenant.id, body.recommendationId, body.status, {
      note: typeof body.note === 'string' ? body.note : null,
      reviewedByUserId: user.id,
    });
    const data = await getIntelligenceRecommendations(prisma, tenant.id);

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
