import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { addProjectMember, listProjectMembers } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
const schema = z.object({ userId: z.string().optional(), employeeId: z.string().optional(), role: z.enum(['MANAGER', 'CONTRIBUTOR', 'VIEWER', 'TIME_APPROVER']), allocationPct: z.coerce.number().min(0).max(200).default(100) });
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'view' }); return NextResponse.json({ data: await listProjectMembers(await resolveProjectActor(user), (await params).id) }); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: /denied|Forbidden/.test(e.message) ? 403 : 500 }); } }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' }); return NextResponse.json({ data: await addProjectMember(await resolveProjectActor(user), (await params).id, schema.parse(await request.json())) }, { status: 201 }); } catch (e: any) { return NextResponse.json({ error: e instanceof ZodError ? 'Validation failed' : e.message, details: e instanceof ZodError ? e.errors : undefined }, { status: e instanceof ZodError ? 400 : 500 }); } }
