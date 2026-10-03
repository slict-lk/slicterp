import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { ensureProjectTemplates } from '@/apps/projects/service';
import { isTenantAdmin, resolveProjectActor } from '@/apps/projects/access-policy';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';

export async function GET() {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'projects', action: 'view' });
    const data = await ensureProjectTemplates(tenantId);
    return NextResponse.json({ data, metadata: { count: data.length } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: error.message?.includes('Forbidden') ? 403 : 500 });
  }
}

const schema = z.object({ key: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_]+$/), name: z.string().trim().min(2).max(160), description: z.string().max(2000).default(''), category: z.string().max(80).default('Custom'), icon: z.string().max(80).default('Layers3'), config: z.record(z.string(), z.unknown()) });
export async function POST(request: NextRequest) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'projects', action: 'create' });
    if (!isTenantAdmin(await resolveProjectActor(user))) return NextResponse.json({ error: 'Tenant administrator access required' }, { status: 403 });
    const input = schema.parse(await request.json());
    const data = await prisma.projectTemplate.create({ data: { tenantId, ...input, isSystem: false } as any });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error instanceof ZodError ? 'Validation failed' : error.message }, { status: error instanceof ZodError ? 400 : error.code === 'P2002' ? 409 : 500 });
  }
}
