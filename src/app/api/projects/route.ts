import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createProject, listProjects } from '@/apps/projects/service';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { projectCreateSchema } from '@/apps/projects/validation';
import { requireTenantContext } from '@/lib/server/erp-context';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'view' });
    const actor = await resolveProjectActor(user);
    const params = request.nextUrl.searchParams;
    const data = await listProjects(actor, {
      status: params.get('status') || undefined,
      search: params.get('search') || undefined,
      archived: params.get('archived') || undefined,
    });
    return NextResponse.json({ data, metadata: { count: data.length } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch projects' }, { status: error.message?.includes('Forbidden') ? 403 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'create' });
    const actor = await resolveProjectActor(user);
    const data = projectCreateSchema.parse(await request.json());
    const project = await createProject(actor, data);
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    const status = error.code === 'P2002' ? 409 : error.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 409 ? 'Project code already exists' : error.message || 'Failed to create project' }, { status });
  }
}
