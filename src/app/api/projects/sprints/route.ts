import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createSprint } from '@/apps/projects/service';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { sprintCreateSchema } from '@/apps/projects/validation';
import { requireTenantContext } from '@/lib/server/erp-context';

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'create' });
    return NextResponse.json({ data: await createSprint(await resolveProjectActor(user), sprintCreateSchema.parse(await request.json())) }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    return NextResponse.json({ error: error.message || 'Failed to create sprint' }, { status: /not found/i.test(error.message) ? 404 : 500 });
  }
}
