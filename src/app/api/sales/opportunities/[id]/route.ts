import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

const client = prisma as any;
export const dynamic = 'force-dynamic';

const opportunitySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
  expectedRevenue: z.number().optional(),
  probability: z.number().optional(),
  stage: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  ownerUserId: z.string().optional(),
  branchId: z.string().optional(),
});

function normalizeOpportunity(opportunity: any) {
  return {
    ...opportunity,
    expectedRevenue: opportunity.expectedRevenue ?? opportunity.amount ?? 0,
    expectedCloseDate: opportunity.expectedCloseDate ?? opportunity.closeDate ?? null,
  };
}

async function attachRelations(item: any) {
  if (!item) return item;
  const [customer, lead] = await Promise.all([
    item.customerId
      ? client.customer.findFirst({
        where: { id: item.customerId },
        select: { id: true, name: true, email: true, phone: true },
      })
      : Promise.resolve(null),
    item.leadId
      ? client.lead.findFirst({
        where: { id: item.leadId },
        select: { id: true, name: true, email: true, status: true },
      })
      : Promise.resolve(null),
  ]);

  return { ...item, customer, lead };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'view' });
    const { id } = await params;
    const item = await client.opportunity.findFirst({
      where: { id, tenantId },
    });
    if (!item) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    const data = normalizeOpportunity(await attachRelations(item));
    return NextResponse.json({ data });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch opportunity' }, { status });
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

    const validatedBody = opportunitySchema.parse(body);
    const existing = await client.opportunity.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

    const item = await client.opportunity.update({
      where: { id },
      data: {
        ...(validatedBody.name !== undefined && { name: validatedBody.name }),
        ...(validatedBody.description !== undefined && { description: validatedBody.description }),
        ...(validatedBody.amount !== undefined && { amount: Number(validatedBody.amount) }),
        ...(validatedBody.expectedRevenue !== undefined && {
          amount: Number(validatedBody.expectedRevenue),
        }),
        ...(validatedBody.probability !== undefined && { probability: Number(validatedBody.probability) }),
        ...(validatedBody.stage !== undefined && { stage: String(validatedBody.stage).toUpperCase() }),
        ...(validatedBody.expectedCloseDate !== undefined && {
          closeDate: validatedBody.expectedCloseDate ? new Date(validatedBody.expectedCloseDate) : null,
        }),
        ...(validatedBody.customerId !== undefined && { customerId: validatedBody.customerId || null }),
        ...(validatedBody.leadId !== undefined && { leadId: validatedBody.leadId || null }),
        ...(validatedBody.ownerUserId !== undefined && { ownerUserId: validatedBody.ownerUserId || null }),
        ...(validatedBody.branchId !== undefined && { branchId: validatedBody.branchId || null }),
      },
    });

    const data = normalizeOpportunity(await attachRelations(item));
    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to update opportunity' }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'delete' });
    const { id } = await params;
    const existing = await client.opportunity.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    await client.opportunity.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to delete opportunity' }, { status });
  }
}
