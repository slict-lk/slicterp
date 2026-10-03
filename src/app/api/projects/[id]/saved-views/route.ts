import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { listSavedViews, saveProjectView } from '@/apps/projects/operations';
import { resolveProjectActor } from '@/apps/projects/access-policy';
import { requireTenantContext } from '@/lib/server/erp-context';

const schema = z.object({ name: z.string().trim().min(1).max(120), viewType: z.enum(['LIST', 'BOARD', 'TIMELINE', 'CALENDAR']), filters: z.record(z.string(), z.unknown()), isShared: z.boolean().default(false) });
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'view' }); return NextResponse.json({ data: await listSavedViews(await resolveProjectActor(user), (await params).id) }); } catch (error: any) { return NextResponse.json({ error: error.message }, { status: /denied|Forbidden/.test(error.message) ? 403 : 500 }); } }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user } = await requireTenantContext({ moduleId: 'projects', action: 'view' }); return NextResponse.json({ data: await saveProjectView(await resolveProjectActor(user), (await params).id, schema.parse(await request.json())) }, { status: 201 }); } catch (error: any) { return NextResponse.json({ error: error instanceof ZodError ? 'Validation failed' : error.message }, { status: error instanceof ZodError ? 400 : 500 }); } }
