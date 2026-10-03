import { NextRequest, NextResponse } from 'next/server';
import { bulkUpdateWorkItems } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
export async function PATCH(request: NextRequest) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' }); return NextResponse.json({ data: await bulkUpdateWorkItems(await resolveProjectActor(user), await request.json()) }); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); } }
