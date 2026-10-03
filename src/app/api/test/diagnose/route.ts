import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Unauthenticated diagnostic endpoint
export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 404 });

    // 1. Check StudioWorkflows
    const workflows = await prisma.studioWorkflow.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true, triggerType: true, triggerConfig: true, isActive: true }
    });

    // 2. Check recent event bus logs
    const eventLogs = await prisma.integrationLog.findMany({
      where: { tenantId: tenant.id, integration: 'ai-event-bus' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, action: true, status: true, createdAt: true, errorMessage: true }
    });

    // 3. Check pending approvals in tenant settings
    const settings = (tenant.settings as any) || {};
    const aiConfig = settings.aiControlPlane || {};
    const pendingApprovals = aiConfig.pendingApprovals || [];
    const executionQueue = aiConfig.executionQueue || [];

    // 4. Check recent opportunities
    const recentOpps = await prisma.opportunity.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, name: true, amount: true, stage: true, createdAt: true }
    });

    return NextResponse.json({
      tenantId: tenant.id,
      tenantName: tenant.name,
      workflows: workflows.map(w => ({
        id: w.id,
        name: w.name,
        triggerType: w.triggerType,
        triggerConfig: w.triggerConfig,
        isActive: w.isActive
      })),
      workflowCount: workflows.length,
      activeWorkflowCount: workflows.filter(w => w.isActive).length,
      recentEventLogs: eventLogs,
      pendingApprovalsCount: pendingApprovals.length,
      pendingApprovals: pendingApprovals.slice(0, 3),
      executionQueueCount: executionQueue.length,
      executionQueue: executionQueue.slice(0, 3),
      recentOpportunities: recentOpps.map(o => ({
        ...o,
        amount: o.amount ? Number(o.amount) : 0
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
