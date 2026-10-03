import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { updateWorkflow } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
const schema = z.object({ statuses: z.array(z.object({ key: z.string().min(1), name: z.string().min(1), category: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED']), color: z.string().min(4), allowedTransitions: z.array(z.string()).default([]) })).min(2) });
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' }); const { statuses } = schema.parse(await request.json()); return NextResponse.json({ data: await updateWorkflow(await resolveProjectActor(user), (await params).id, statuses) }); } catch (e: any) { return NextResponse.json({ error: e instanceof ZodError ? 'Validation failed' : e.message }, { status: e instanceof ZodError ? 400 : 500 }); } }
