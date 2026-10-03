import { NextRequest, NextResponse } from 'next/server';
import { createOpportunity, listOpportunities } from '@/apps/crm/api';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { evaluatePolicyDecision, getTenantAIConfig, saveTenantAIConfig, logControlPlaneEvent } from '@/lib/ai/control-plane';
import type { ApprovalItem } from '@/lib/ai/control-plane-types';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const oppCreateSchema = z.object({
  name: z.string().min(1, 'name is required'),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  amount: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).optional(),
}).passthrough();

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'crm', action: 'view' });
    const { searchParams } = new URL(request.url);
    const data = await listOpportunities(tenantId, {
      status: searchParams.get('status') || undefined,
      pipelineId: searchParams.get('pipelineId') || undefined,
      stageId: searchParams.get('stageId') || undefined,
      search: searchParams.get('search') || undefined,
    });

    return NextResponse.json({ data, metadata: { count: data.length } });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch opportunities' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'crm', action: 'create' });
    const body = await request.json();
    const parsedData = oppCreateSchema.parse(body);

    const opportunity = await createOpportunity(tenantId, user.id, parsedData);
    
    // --- Direct approval creation for high-value opportunities ---
    const opportunityAmount = parsedData.amount || Number(opportunity.amount || 0);
    try {
      // 1. Publish domain event for audit trail
      await publishModuleMutationEvent({
        tenantId,
        module: 'crm',
        entity: 'opportunity',
        event: 'created',
        actorId: user.id,
        payload: {
          opportunityId: opportunity.id,
          name: opportunity.name,
          status: opportunity.status,
          amount: opportunityAmount,
          currency: parsedData.currency || 'LKR',
          customerId: parsedData.customerId || null,
          customerName: 'Customer',
        },
      });

      // 2. Directly evaluate policy and create approval if needed
      const decision = evaluatePolicyDecision({
        category: 'financial',
        amount: opportunityAmount,
      });

      if (decision.requiresApproval) {
        const config = await getTenantAIConfig(tenantId);
        const approvalItem: ApprovalItem = {
          id: `approval-${crypto.randomUUID()}`,
          tenantId,
          module: 'crm',
          title: `High-Value Opportunity: ${opportunity.name}`,
          summary: `A new opportunity worth $${opportunityAmount.toLocaleString()} requires approval (risk score: ${decision.riskScore}).`,
          requestedBy: user.id,
          riskScore: decision.riskScore,
          actionCategory: 'financial',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          dueAt: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
          correlationId: `corr-opp-${opportunity.id}`,
          payload: {
            opportunityId: opportunity.id,
            name: opportunity.name,
            amount: opportunityAmount,
            status: opportunity.status,
          },
          assignedRole: 'AI_ADMIN',
          assignmentChain: ['AI_ADMIN', 'APPROVER'],
          escalationLevel: 0,
          notifications: [{
            id: `note-${crypto.randomUUID()}`,
            type: 'created',
            sentAt: new Date().toISOString(),
            recipient: 'AI_ADMIN',
            channel: 'in-app',
            summary: `Opportunity "${opportunity.name}" ($${opportunityAmount.toLocaleString()}) queued for approval`,
          }],
          escalationHistory: [],
          executionRequest: {
            module: 'crm',
            action: 'follow_up_task',
            input: {
              title: `Review high-value opportunity: ${opportunity.name}`,
              description: `This opportunity is worth $${opportunityAmount.toLocaleString()} and was flagged for review. Created by AI governance policy.`,
              priority: 'HIGH',
              opportunityId: opportunity.id,
            },
            requestedByUserId: user.id,
          },
        };

        await saveTenantAIConfig(tenantId, {
          ...config,
          pendingApprovals: [approvalItem, ...config.pendingApprovals],
        });

        await logControlPlaneEvent({
          tenantId,
          integration: 'ai-approval',
          action: 'crm.opportunity.created',
          status: 'PENDING',
          requestData: { approvalId: approvalItem.id, riskScore: decision.riskScore, amount: opportunityAmount },
        });

        console.log(`✅ Created approval item ${approvalItem.id} for CRM opportunity ${opportunity.name} ($${opportunityAmount})`);
      }
    } catch (publishError) {
      console.error('Failed to process CRM opportunity AI automation:', publishError);
    }

    return NextResponse.json({ data: opportunity }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Forbidden')
      ? 403
      : /invalid|restricted|not allowed|requires approval/i.test(message)
        ? 400
        : 500;
    
    console.error('--- OPPORTUNITY CREATION CRASH ---', error);
    
    // The stack trace and raw Prisma message stay in the server log above;
    // only the classified, client-safe message crosses the wire.
    return NextResponse.json(
      { error: status === 500 ? 'Internal Server Error' : message },
      { status }
    );
  }
}
