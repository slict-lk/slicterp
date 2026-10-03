import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import {
  explainIntelligenceEntity,
  getExplanationSeedData,
} from '@/lib/intelligence/ai/intelligence-ai-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    await requireAnyPermission([{ moduleId: 'intelligence', action: 'view' }, { moduleId: 'ai', action: 'view' }]);

    const data = await getExplanationSeedData(prisma, tenant.id);
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    const user = await requireAnyPermission([{ moduleId: 'intelligence', action: 'view' }, { moduleId: 'ai', action: 'view' }]);

    const body = await request.json().catch(() => ({}));
    const surface =
      body?.surface === 'readiness' ||
      body?.surface === 'workforce' ||
      body?.surface === 'constraints' ||
      body?.surface === 'toc' ||
      body?.surface === 'simulator' ||
      body?.surface === 'recommendations'
        ? body.surface
        : 'overview';
    const explanation = await explainIntelligenceEntity(prisma, tenant.id, user.id, {
      surface,
      entityType: body?.entityType,
      entityId: body?.entityId ?? null,
    });

    return NextResponse.json({
      success: true,
      data: explanation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
