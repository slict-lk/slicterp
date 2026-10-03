import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { addChecklistItem, updateChecklistItem } from '@/apps/projects/service';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { checklistCreateSchema } from '@/apps/projects/validation';
import { requireTenantContext } from '@/lib/server/erp-context';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' });
    const { title } = checklistCreateSchema.parse(await request.json());
    return NextResponse.json({ data: await addChecklistItem(await resolveProjectActor(user), (await params).id, title) }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    return NextResponse.json({ error: error.message || 'Failed to add checklist item' }, { status: /not found/i.test(error.message) ? 404 : 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' });
    const body = await request.json();
    if (!body.itemId || typeof body.isCompleted !== 'boolean') return NextResponse.json({ error: 'itemId and isCompleted are required' }, { status: 400 });
    return NextResponse.json({ data: await updateChecklistItem(await resolveProjectActor(user), (await params).id, body.itemId, body.isCompleted) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update checklist item' }, { status: /not found/i.test(error.message) ? 404 : 500 });
  }
}
