import { NextRequest, NextResponse } from 'next/server';
import { deleteLead, getLeadById, updateLead } from '@/apps/crm/api';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const leadUpdateSchema = z.object({
  branchId: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  customerAccountId: z.string().optional(),
  partyId: z.string().optional(),
  ownerUserId: z.string().optional(),
  source: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  score: z.number().optional(),
  expectedRevenue: z.number().optional(),
  probabilityPercent: z.number().optional(),
  nextActionAt: z.string().optional().nullable(),
  notes: z.string().optional(),
}).passthrough();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'crm', action: 'view' });
    const { id } = await params;
    const lead = await getLeadById(tenantId, id);
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: lead });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch lead' }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'crm', action: 'edit' });
    const { id } = await params;
    const body = await request.json();
    const parsedData = leadUpdateSchema.parse(body);

    const lead = await updateLead(tenantId, id, parsedData, {
      userId: user.id,
      actorName: user.name ?? user.email ?? null,
    });
    return NextResponse.json({ data: lead });
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
      { error: status === 403 ? 'Forbidden' : status === 500 ? 'Failed to update lead' : message || 'Invalid request' },
      { status }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'crm', action: 'delete' });
    const { id } = await params;
    const result = await deleteLead(tenantId, id);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to delete lead' }, { status });
  }
}
