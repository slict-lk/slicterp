import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { addTaskComment } from '@/apps/projects/service';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { commentCreateSchema } from '@/apps/projects/validation';
import { requireTenantContext } from '@/lib/server/erp-context';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' });
    const { body } = commentCreateSchema.parse(await request.json());
    return NextResponse.json({ data: await addTaskComment(await resolveProjectActor(user), (await params).id, body) }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    return NextResponse.json({ error: error.message || 'Failed to add comment' }, { status: /not found/i.test(error.message) ? 404 : 500 });
  }
}
