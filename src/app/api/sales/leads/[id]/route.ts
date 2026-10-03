import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

const client = prisma as any;
export const dynamic = 'force-dynamic';

const leadUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  score: z.number().optional(),
  probability: z.number().min(0).max(100).optional().nullable(),
  expectedRevenue: z.number().optional().nullable(),
  notes: z.string().optional(),
  customerId: z.string().optional().nullable(),
}).passthrough();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'view' });
    const { id } = await params;

    const lead = await client.lead.findFirst({
      where: { id, tenantId },
      include: { customer: true },
    });

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json({ data: lead });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    console.error('Error fetching lead:', error);
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch lead' }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'edit' });
    const { id } = await params;
    const body = await request.json();
    const validated = leadUpdateSchema.parse(body);

    const existingLead = await client.lead.findFirst({ where: { id, tenantId } });
    if (!existingLead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const lead = await client.lead.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.email !== undefined && { email: validated.email }),
        ...(validated.phone !== undefined && { phone: validated.phone }),
        ...(validated.source !== undefined && { source: validated.source }),
        ...(validated.status !== undefined && { status: validated.status }),
        ...(validated.priority !== undefined && { priority: validated.priority }),
        ...(validated.score !== undefined && { score: validated.score }),
        ...(validated.probability !== undefined && { probability: validated.probability }),
        ...(validated.expectedRevenue !== undefined && { expectedRevenue: validated.expectedRevenue }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
        ...(validated.customerId !== undefined && { customerId: validated.customerId }),
      },
    });

    return NextResponse.json({ data: lead });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to update lead' }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'delete' });
    const { id } = await params;
    const existingLead = await client.lead.findFirst({ where: { id, tenantId } });
    if (!existingLead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    await client.lead.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to delete lead' }, { status });
  }
}

