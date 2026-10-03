import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

const client = prisma as any;
export const dynamic = 'force-dynamic';

const leadCreateSchema = z.object({
  name: z.string().min(1, 'name is required'),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status: z.string().optional(),
  priority: z.string().optional(),
  score: z.number().optional().nullable(),
  probability: z.number().optional().nullable(),
  expectedRevenue: z.union([z.number(), z.string()]).optional().nullable(),
  notes: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
}).passthrough();

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'view' });
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');
    const search = searchParams.get('search');

    const leads = await client.lead.findMany({
      where: {
        tenantId,
        ...(statusParam && { status: statusParam }),
        ...(priorityParam && { priority: priorityParam }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }),
      },
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = leads.map((lead: any) => ({
      ...lead,
      priority: lead.priority ?? 'MEDIUM',
      expectedRevenue: lead.expectedRevenue ?? null,
      probability: lead.probability ?? null,
    }));

    return NextResponse.json({ items, metadata: { count: items.length } });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch leads' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'create' });
    const body = await request.json();
    const parsed = leadCreateSchema.parse(body);

    const lead = await client.lead.create({
      data: {
        name: parsed.name,
        email: parsed.email || '',
        phone: parsed.phone ?? null,
        source: parsed.source ?? null,
        status: parsed.status || 'NEW',
        priority: parsed.priority || 'MEDIUM',
        score: parsed.score ?? 0,
        probability: parsed.probability ?? null,
        expectedRevenue: parsed.expectedRevenue != null ? Number(parsed.expectedRevenue) : null,
        notes: parsed.notes ?? null,
        customerId: parsed.customerId ?? null,
        tenantId,
      },
    });

    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to create lead' }, { status });
  }
}
