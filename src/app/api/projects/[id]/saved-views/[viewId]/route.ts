import { NextRequest, NextResponse } from 'next/server';
import { deleteSavedView } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; viewId: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'view' }); const values = await params; return NextResponse.json({ data: await deleteSavedView(await resolveProjectActor(user), values.id, values.viewId) }); } catch (error: any) { return NextResponse.json({ error: error.message }, { status: /not found/.test(error.message) ? 404 : 500 }); } }
