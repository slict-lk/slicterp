import { NextResponse } from 'next/server';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import { getIntelligenceAIAudit } from '@/lib/intelligence/ai/intelligence-ai-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    await requireAnyPermission([{ moduleId: 'intelligence', action: 'view' }, { moduleId: 'ai', action: 'view' }]);

    const records = await getIntelligenceAIAudit(tenant.id);

    return NextResponse.json({
      success: true,
      data: {
        records,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
