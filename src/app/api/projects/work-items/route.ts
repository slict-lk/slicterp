import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createWorkItem, listWorkItems } from '@/apps/projects/service';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { workItemCreateSchema } from '@/apps/projects/validation';
import { requireTenantContext } from '@/lib/server/erp-context';

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'view' });
    const actor = await resolveProjectActor(user);
    const params = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(Number(params.get('limit') || 50), 1), 100);
    const rows = await listWorkItems(actor, Object.fromEntries(['projectId', 'status', 'type', 'priority', 'assigneeId', 'search', 'archived'].map((key) => [key, params.get(key) || undefined])), { cursor: params.get('cursor') || undefined, limit });
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return NextResponse.json({ data, metadata: { count: data.length, hasMore, nextCursor: hasMore ? data.at(-1)?.id : null } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch work items' }, { status: error.message?.includes('Forbidden') ? 403 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'create' });
    const data = workItemCreateSchema.parse(await request.json());
    return NextResponse.json({ data: await createWorkItem(await resolveProjectActor(user), data) }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    return NextResponse.json({ error: error.message || 'Failed to create work item' }, { status: /not found/i.test(error.message) ? 404 : error.message?.includes('Forbidden') ? 403 : 500 });
  }
}
