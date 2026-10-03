import { NextRequest, NextResponse } from 'next/server';
import { createActivity, listActivities } from '@/apps/crm/api';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const listQuerySchema = z.object({
  leadId: z.string().optional(),
  opportunityId: z.string().optional(),
  accountId: z.string().optional(),
  status: z.string().optional(),
  limit: z.string().optional(),
});

const activityCreateSchema = z.object({
  activityType: z.string().min(1, 'activityType is required'),
  subject: z.string().min(1, 'subject is required'),
  description: z.string().optional(),
  status: z.string().optional(),
  scheduledAt: z.string().optional(),
  leadId: z.string().optional(),
  opportunityId: z.string().optional(),
  accountId: z.string().optional(),
}).passthrough();

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'crm', action: 'view' });
    const { searchParams } = new URL(request.url);

    const validated = listQuerySchema.parse({
      leadId: searchParams.get('leadId') || undefined,
      opportunityId: searchParams.get('opportunityId') || undefined,
      accountId: searchParams.get('accountId') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const items = await listActivities(tenantId, validated);
    return NextResponse.json({ data: items, metadata: { count: items.length } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch activities' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'crm', action: 'create' });
    const body = await request.json();
    const parsedData = activityCreateSchema.parse(body);

    const item = await createActivity(tenantId, user.id, parsedData);
    try {
      await publishModuleMutationEvent({
        tenantId,
        module: 'crm',
        entity: 'activity',
        event: 'created',
        actorId: user.id,
        payload: {
          activityId: item.id,
          activityType: item.activityType,
          status: item.status,
        },
      });
    } catch (publishError) {
      console.error('Failed to publish activity mutation event:', { tenantId, activityId: item.id, userId: user.id, error: publishError });
    }
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to create activity' }, { status });
  }
}
