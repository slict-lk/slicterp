import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { updateProjectMember } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
const schema = z.object({ role: z.enum(['MANAGER', 'CONTRIBUTOR', 'VIEWER', 'TIME_APPROVER']).optional(), allocationPct: z.coerce.number().min(0).max(200).optional(), remove: z.boolean().optional() });
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' }); const p = await params; return NextResponse.json({ data: await updateProjectMember(await resolveProjectActor(user), p.id, p.memberId, schema.parse(await request.json())) }); } catch (e: any) { return NextResponse.json({ error: e instanceof ZodError ? 'Validation failed' : e.message }, { status: e instanceof ZodError ? 400 : 500 }); } }
