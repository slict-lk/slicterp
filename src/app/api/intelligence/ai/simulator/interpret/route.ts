import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import { simulateWithAIInterpretation } from '@/lib/intelligence/ai/intelligence-ai-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    const user = await requireAnyPermission([{ moduleId: 'intelligence', action: 'approve' }, { moduleId: 'ai', action: 'approve' }]);

    const body = await request.json().catch(() => ({}));
    const result = await simulateWithAIInterpretation(prisma, tenant.id, user.id, {
      scenarioType: body?.scenarioType ?? 'PROMOTE_EMPLOYEE',
      employeeId: body?.employeeId ?? null,
      departmentName: body?.departmentName ?? null,
      workloadChangePercent:
        typeof body?.workloadChangePercent === 'number' ? body.workloadChangePercent : null,
      approvalDelegationThreshold:
        typeof body?.approvalDelegationThreshold === 'number' ? body.approvalDelegationThreshold : null,
      branchCount:
        typeof body?.branchCount === 'number' ? body.branchCount : null,
    });

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
