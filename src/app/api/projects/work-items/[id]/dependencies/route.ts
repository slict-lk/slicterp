import { NextRequest, NextResponse } from 'next/server';
import { addDependency } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' }); const body = await request.json(); return NextResponse.json({ data: await addDependency(await resolveProjectActor(user), (await params).id, body.dependsOnId, body.type) }, { status: 201 }); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: /Circular|Invalid/.test(e.message) ? 400 : 500 }); } }
