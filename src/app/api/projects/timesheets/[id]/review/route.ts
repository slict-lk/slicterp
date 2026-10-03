import { NextRequest, NextResponse } from 'next/server';
import { reviewTimesheet } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'approve' }); const body = await request.json(); return NextResponse.json({ data: await reviewTimesheet(await resolveProjectActor(user), (await params).id, Boolean(body.approve), body.reason) }); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); } }
