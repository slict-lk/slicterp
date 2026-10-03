import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import { getIntelligenceRecommendationDraft } from '@/lib/intelligence/ai/intelligence-ai-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    const user = await requireAnyPermission([{ moduleId: 'intelligence', action: 'view' }, { moduleId: 'ai', action: 'view' }]);

    const body = await request.json().catch(() => ({}));
    const recommendationId = String(body?.recommendationId ?? '').trim();

    if (!recommendationId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'recommendationId is required',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const draft = await getIntelligenceRecommendationDraft(prisma, tenant.id, user.id, recommendationId);

    return NextResponse.json({
      success: true,
      data: draft,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
