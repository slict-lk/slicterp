import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import { getIntelligenceAIContext, getIntelligenceAISummary } from '@/lib/intelligence/ai/intelligence-ai-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    const user = await requireAnyPermission([{ moduleId: 'intelligence', action: 'view' }, { moduleId: 'ai', action: 'view' }]);

    const context = await getIntelligenceAIContext(prisma, tenant.id);
    let summary;

    try {
      summary = await getIntelligenceAISummary(prisma, tenant.id, user.id);
    } catch {
      summary = {
        headline: context.constraints.top[0]?.name ?? 'No primary constraint available',
        gated: context.gated,
        content: context.gated
          ? 'Intelligence AI summary is gated until readiness passes.'
          : 'AI summary is temporarily unavailable. Use the dedicated intelligence AI pages to retry generation.',
        confidence: 0,
        freshness: {
          workforce: context.freshness.workforce,
        },
        sourceSections: ['readiness', 'workforce', 'constraints'],
        warnings: context.readiness.warnings,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
        },
        context,
        summary,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
