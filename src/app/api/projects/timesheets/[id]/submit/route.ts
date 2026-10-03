import { NextRequest, NextResponse } from 'next/server';
import { submitTimesheet } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' }); return NextResponse.json({ data: await submitTimesheet(await resolveProjectActor(user), (await params).id) }); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); } }
