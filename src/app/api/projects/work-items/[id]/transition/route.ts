import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { transitionWorkItem } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';
const schema = z.object({ targetKey: z.string().min(1), rank: z.number().optional() });
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' }); const body = schema.parse(await request.json()); return NextResponse.json({ data: await transitionWorkItem(await resolveProjectActor(user), (await params).id, body.targetKey, body.rank) }); } catch (e: any) { return NextResponse.json({ error: e instanceof ZodError ? 'Validation failed' : e.message }, { status: e instanceof ZodError ? 400 : /not allowed/.test(e.message) ? 409 : 500 }); } }
