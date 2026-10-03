import { NextRequest, NextResponse } from 'next/server';
import { createLead, listLeads } from '@/apps/crm/api';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const listQuerySchema = z.object({
  status: z.string().optional(),
  ownerUserId: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  search: z.string().optional(),
});

const leadCreateSchema = z.object({
  name: z.string().min(1, 'name is required'),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  expectedRevenue: z.number().min(0).optional(),
}).passthrough();

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'crm', action: 'view' });
    const { searchParams } = new URL(request.url);

    const validated = listQuerySchema.parse({
      status: searchParams.get('status') || undefined,
      ownerUserId: searchParams.get('ownerUserId') || undefined,
      pipelineId: searchParams.get('pipelineId') || undefined,
      stageId: searchParams.get('stageId') || undefined,
      search: searchParams.get('search') || undefined,
    });

    const items = await listLeads(tenantId, validated);
    return NextResponse.json({ data: items, metadata: { count: items.length } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch leads' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'crm', action: 'create' });
    const body = await request.json();
    const parsedData = leadCreateSchema.parse(body);

    const lead = await createLead(tenantId, user.id, parsedData);
    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const message = String(error?.message || '');
    const status = message.includes('Forbidden')
      ? 403
      : /invalid|restricted|not allowed|requires approval/i.test(message)
        ? 400
        : 500;
    return NextResponse.json(
      { error: status === 403 ? 'Forbidden' : status === 500 ? 'Failed to create lead' : message || 'Invalid request' },
      { status }
    );
  }
}
