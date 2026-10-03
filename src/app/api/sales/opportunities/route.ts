import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { evaluatePolicyDecision, getTenantAIConfig, saveTenantAIConfig, logControlPlaneEvent } from '@/lib/ai/control-plane';
import type { ApprovalItem } from '@/lib/ai/control-plane-types';

const client = prisma as any;
export const dynamic = 'force-dynamic';

const oppCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  amount: z.union([z.number(), z.string()]).optional(),
  expectedRevenue: z.union([z.number(), z.string()]).optional(),
  probability: z.union([z.number(), z.string()]).optional(),
  stage: z.string().optional(),
  closeDate: z.string().optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  ownerUserId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
}).passthrough();

function normalizeOpportunity(opportunity: any) {
  return {
    ...opportunity,
    expectedRevenue: opportunity.expectedRevenue ?? opportunity.amount ?? 0,
    expectedCloseDate: opportunity.expectedCloseDate ?? opportunity.closeDate ?? null,
    stage: opportunity.stage,
  };
}

function mapStage(stage?: string | null) {
  if (!stage) return undefined;
  return stage.toUpperCase();
}

async function attachRelations(opportunities: any[]) {
  if (opportunities.length === 0) return opportunities;

  const customerIds = Array.from(new Set(opportunities.map((o) => o.customerId).filter(Boolean)));
  const leadIds = Array.from(new Set(opportunities.map((o) => o.leadId).filter(Boolean)));

  const [customers, leads] = await Promise.all([
    customerIds.length
      ? client.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true, email: true, phone: true },
      })
      : Promise.resolve([]),
    leadIds.length
      ? client.lead.findMany({
        where: { id: { in: leadIds } },
        select: { id: true, name: true, email: true, status: true },
      })
      : Promise.resolve([]),
  ]);

  const customerMap = new Map(customers.map((c: any) => [c.id, c]));
  const leadMap = new Map(leads.map((l: any) => [l.id, l]));

  return opportunities.map((o) => ({
    ...o,
    customer: o.customerId ? customerMap.get(o.customerId) ?? null : null,
    lead: o.leadId ? leadMap.get(o.leadId) ?? null : null,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'view' });
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const search = searchParams.get('search');

    const opportunities = await client.opportunity.findMany({
      where: {
        tenantId,
        ...(stage && { stage: mapStage(stage) }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
    });

    const hydrated = await attachRelations(opportunities);
    const items = hydrated.map(normalizeOpportunity);
    return NextResponse.json({ items, metadata: { count: items.length } });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    console.error('Error fetching opportunities:', error);
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch opportunities' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'sales', action: 'create' });
    const body = await request.json();
    const parsed = oppCreateSchema.parse(body);

    const opportunity = await client.opportunity.create({
      data: {
        name: parsed.name,
        description: parsed.description ?? null,
        amount: Number(parsed.amount ?? parsed.expectedRevenue ?? 0),
        probability: Number(parsed.probability ?? 50),
        stage: mapStage(parsed.stage) || 'QUALIFICATION',
        closeDate: parsed.closeDate ? new Date(parsed.closeDate) : (parsed.expectedCloseDate ? new Date(parsed.expectedCloseDate) : null),
        customerId: parsed.customerId || null,
        leadId: parsed.leadId || null,
        tenantId,
        ownerUserId: parsed.ownerUserId || null,
        branchId: parsed.branchId || null,
      },
      include: {
        customer: true,
        lead: true,
      },
    });

    // --- Direct approval creation for high-value opportunities ---
    const opportunityAmount = opportunity.amount ? Number(opportunity.amount) : 0;
    try {
      // 1. Always publish the domain event for audit trail
      await publishModuleMutationEvent({
        tenantId,
        module: 'crm',
        entity: 'opportunity',
        event: 'created',
        actorId: user.id,
        payload: {
          opportunityId: opportunity.id,
          name: opportunity.name,
          status: opportunity.stage,
          amount: opportunityAmount,
          currency: 'USD',
          customerId: opportunity.customerId || null,
          customerName: opportunity.customer?.name || 'N/A',
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
          dueAt: new Date(Date.now() + 1000 * 60 * 120).toISOString(), // 2 hours
          correlationId: `corr-opp-${opportunity.id}`,
          payload: {
            opportunityId: opportunity.id,
            name: opportunity.name,
            amount: opportunityAmount,
            stage: opportunity.stage,
            customerId: opportunity.customerId,
            customerName: opportunity.customer?.name || 'N/A',
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

        console.log(`✅ Created approval item ${approvalItem.id} for opportunity ${opportunity.name} ($${opportunityAmount})`);
      }
    } catch (publishError) {
      console.error('Failed to process opportunity AI automation:', publishError);
    }

    return NextResponse.json({ data: normalizeOpportunity(opportunity) }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Forbidden') ? 403 : 500;
    console.error('Error creating opportunity:', error);
    return NextResponse.json(
      { error: status === 403 ? 'Forbidden' : 'Failed to create opportunity', debug: message }, 
      { status }
    );
  }
}
