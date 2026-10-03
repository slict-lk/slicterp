import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { isTenantAdmin, resolveProjectActor } from '@/apps/projects/access-policy';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';

const schema = z.object({ name: z.string().trim().min(2).max(160).optional(), description: z.string().max(2000).optional(), category: z.string().max(80).optional(), icon: z.string().max(80).optional(), config: z.record(z.string(), z.unknown()).optional(), isActive: z.boolean().optional(), version: z.number().int().positive() });
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'projects', action: 'edit' });
    if (!isTenantAdmin(await resolveProjectActor(user))) return NextResponse.json({ error: 'Tenant administrator access required' }, { status: 403 });
    const input = schema.parse(await request.json());
    const current = await prisma.projectTemplate.findFirst({ where: { id: (await params).id, tenantId } });
    if (!current) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    if (current.isSystem) return NextResponse.json({ error: 'Built-in templates cannot be edited or archived. Clone it first.' }, { status: 400 });
    if (current.version !== input.version) return NextResponse.json({ error: 'Template was updated by another user' }, { status: 409 });
    const { version: _version, ...changes } = input;
    const data = await prisma.projectTemplate.update({ where: { id: current.id }, data: { ...changes, version: { increment: 1 } } as any });
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error instanceof ZodError ? 'Validation failed' : error.message }, { status: error instanceof ZodError ? 400 : 500 });
  }
}
