import { NextRequest, NextResponse } from 'next/server';
import { addWatcher } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'view' }); const body = await request.json(); return NextResponse.json({ data: await addWatcher(await resolveProjectActor(user), (await params).id, body.userId || user.id) }, { status: 201 }); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); } }
