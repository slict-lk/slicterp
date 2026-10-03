import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getProject, updateProject } from '@/apps/projects/service';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { projectUpdateSchema } from '@/apps/projects/validation';
import { requireTenantContext } from '@/lib/server/erp-context';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'view' });
    const data = await getProject(await resolveProjectActor(user), (await params).id);
    return data ? NextResponse.json({ data }) : NextResponse.json({ error: 'Project not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch project' }, { status: error.message?.includes('Forbidden') ? 403 : 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' });
    const data = projectUpdateSchema.parse(await request.json());
    return NextResponse.json({ data: await updateProject(await resolveProjectActor(user), (await params).id, data) });
  } catch (error: any) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    const status = /not found/i.test(error.message) ? 404 : /another user/i.test(error.message) ? 409 : error.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed to update project' }, { status });
  }
}
