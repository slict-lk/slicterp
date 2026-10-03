import { NextRequest, NextResponse } from 'next/server';
import { createProjectDraftInvoice } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
import { requirePermission } from '@/lib/auth';
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'approve' }); await requirePermission('accounting', 'create'); return NextResponse.json({ data: await createProjectDraftInvoice(await resolveProjectActor(user), (await params).id) }, { status: 201 }); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: /Forbidden/.test(e.message) ? 403 : 500 }); } }
