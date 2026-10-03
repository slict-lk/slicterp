import { NextResponse } from 'next/server';
import { getProjectsOverview } from '@/apps/projects/service';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';

export async function GET() {
  try {
    const { user } = await requireTenantContext({ moduleId: 'projects', action: 'view' });
    return NextResponse.json({ data: await getProjectsOverview(await resolveProjectActor(user)) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch overview' }, { status: error.message?.includes('Forbidden') ? 403 : 500 });
  }
}
