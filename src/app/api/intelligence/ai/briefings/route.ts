import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import { generateExecutiveBriefing } from '@/lib/intelligence/ai/intelligence-ai-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    const user = await requireAnyPermission([{ moduleId: 'intelligence', action: 'view' }, { moduleId: 'ai', action: 'view' }]);

    const body = await request.json().catch(() => ({}));
    const audience =
      body?.audience === 'HR' || body?.audience === 'OPERATIONS' || body?.audience === 'CEO'
        ? body.audience
        : 'CEO';
    const timeRange = body?.timeRange ?? 'current';

    const briefing = await generateExecutiveBriefing(prisma, tenant.id, user.id, audience, timeRange);

    return NextResponse.json({
      success: true,
      data: briefing,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
