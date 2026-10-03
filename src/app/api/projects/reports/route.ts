import { NextRequest, NextResponse } from 'next/server';
import { getProjectReports } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
export async function GET(request: NextRequest) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'view' }); return NextResponse.json({ data: await getProjectReports(await resolveProjectActor(user), request.nextUrl.searchParams.get('projectId') || undefined) }); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); } }
