import { NextRequest, NextResponse } from 'next/server';
import { updateMilestone } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' }); const p = await params; return NextResponse.json({ data: await updateMilestone(await resolveProjectActor(user), p.id, p.milestoneId, await request.json()) }); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: /another user/.test(e.message) ? 409 : 500 }); } }
