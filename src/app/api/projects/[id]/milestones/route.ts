import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { createMilestone } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
const schema = z.object({ name: z.string().min(1), description: z.string().optional(), dueDate: z.string().nullable().optional(), approvalRequired: z.boolean().default(false), billableAmount: z.coerce.number().min(0).nullable().optional() });
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' }); return NextResponse.json({ data: await createMilestone(await resolveProjectActor(user), (await params).id, schema.parse(await request.json())) }, { status: 201 }); } catch (e: any) { return NextResponse.json({ error: e instanceof ZodError ? 'Validation failed' : e.message }, { status: e instanceof ZodError ? 400 : 500 }); } }
