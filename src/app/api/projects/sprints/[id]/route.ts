import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { updateSprint } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';

const schema = z.object({ name: z.string().min(1).max(120).optional(), goal: z.string().max(2000).nullable().optional(), startDate: z.string().nullable().optional(), endDate: z.string().nullable().optional(), status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(), carryForwardToSprintId: z.string().optional(), version: z.number().int().positive().optional() });
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' }); return NextResponse.json({ data: await updateSprint(await resolveProjectActor(user), (await params).id, schema.parse(await request.json())) }); } catch (error: any) { return NextResponse.json({ error: error instanceof ZodError ? 'Validation failed' : error.message }, { status: error instanceof ZodError ? 400 : /another|active sprint/.test(error.message) ? 409 : 500 }); } }
