import { NextRequest, NextResponse } from 'next/server';
import { deleteOpportunity, getOpportunityById, updateOpportunity } from '@/apps/crm/api';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const opportunityUpdateSchema = z.object({
  branchId: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  customerAccountId: z.string().optional(),
  partyId: z.string().optional(),
  leadId: z.string().optional(),
  ownerUserId: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  expectedRevenue: z.union([z.number(), z.string()]).optional(),
  currency: z.string().optional(),
  probabilityPercent: z.number().optional(),
  probability: z.number().optional(),
  expectedCloseDate: z.string().optional().nullable(),
  status: z.string().optional(),
  priority: z.string().optional(),
  nextActionAt: z.string().optional().nullable(),
  approvalRequired: z.boolean().optional(),
  metadata: z.any().optional(),
}).passthrough();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'crm', action: 'view' });
    const { id } = await params;
    const item = await getOpportunityById(tenantId, id);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch opportunity' }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'crm', action: 'edit' });
    const { id } = await params;
    const body = await request.json();
    const parsedData = opportunityUpdateSchema.parse(body);

    const item = await updateOpportunity(tenantId, id, parsedData, {
      userId: user.id,
      actorName: user.name ?? user.email ?? null,
    });
    try {
      await publishModuleMutationEvent({
        tenantId,
        module: 'crm',
        entity: 'opportunity',
        event: 'updated',
        actorId: user.id,
        payload: {
          opportunityId: item.id,
          name: item.name,
          status: item.status,
        },
      });
    } catch (publishError) {
      console.error('Failed to publish opportunity mutation event:', { tenantId, opportunityId: item.id, userId: user.id, error: publishError });
    }
    return NextResponse.json({ data: item });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const message = String(error?.message || '');
    const status = message.includes('Forbidden')
      ? 403
      : /not found/i.test(message)
        ? 404
        : /invalid|restricted|not allowed|requires approval/i.test(message)
          ? 400
          : 500;
    return NextResponse.json(
      {
        error:
          status === 403
            ? 'Forbidden'
            : status === 500
              ? 'Failed to update opportunity'
              : message || 'Invalid request',
      },
      { status }
    );
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return PATCH(request, ctx);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'crm', action: 'delete' });
    const { id } = await params;
    const result = await deleteOpportunity(tenantId, id);
    try {
      await publishModuleMutationEvent({
        tenantId,
        module: 'crm',
        entity: 'opportunity',
        event: 'deleted',
        actorId: user.id,
        payload: {
          opportunityId: id,
        },
      });
    } catch (publishError) {
      console.error('Failed to publish opportunity deletion event:', { tenantId, opportunityId: id, userId: user.id, error: publishError });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to delete opportunity' }, { status });
  }
}
