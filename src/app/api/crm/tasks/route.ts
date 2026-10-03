import { NextRequest, NextResponse } from 'next/server';
import { createTask, listTasks } from '@/apps/crm/api';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const taskCreateSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  dueAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  assignedToUserId: z.string().optional(),
  branchId: z.string().optional(),
  accountId: z.string().optional(),
  leadId: z.string().optional(),
  opportunityId: z.string().optional(),
}).passthrough();

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'crm', action: 'view' });
    const { searchParams } = new URL(request.url);
    const items = await listTasks(tenantId, {
      status: searchParams.get('status') || undefined,
      assignedToUserId: searchParams.get('assignedToUserId') || undefined,
      leadId: searchParams.get('leadId') || undefined,
      opportunityId: searchParams.get('opportunityId') || undefined,
    });
    return NextResponse.json({ items, metadata: { count: items.length } });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch tasks' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'crm', action: 'create' });
    const body = await request.json();
    const parsedData = taskCreateSchema.parse(body);

    const item = await createTask(tenantId, user.id, parsedData);
    try {
      await publishModuleMutationEvent({
        tenantId,
        module: 'crm',
        entity: 'task',
        event: 'created',
        actorId: user.id,
        payload: {
          taskId: item.id,
          title: item.title,
          status: item.status,
        },
      });
    } catch (publishError) {
      console.error('Failed to publish task mutation event:', { tenantId, taskId: item.id, userId: user.id, error: publishError });
    }
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to create task' }, { status });
  }
}
