import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

const client = prisma as any;
export const dynamic = 'force-dynamic';

const quotationLineUpdateSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  discount: z.number().optional(),
  tax: z.number().optional(),
  lineTotal: z.number().optional(),
}).passthrough();

const quotationUpdateSchema = z.object({
  quoteNumber: z.string().optional(),
  status: z.string().optional(),
  validUntil: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  grandTotal: z.number().optional(),
  notes: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  currency: z.string().optional(),
  lines: z.array(quotationLineUpdateSchema).optional(),
}).passthrough();

function calcLine(line: any) {
  const quantity = Number(line.quantity || 0);
  const unitPrice = Number(line.unitPrice || 0);
  const discount = Number(line.discount || 0);
  const tax = Number(line.tax || 0);
  const subtotal = quantity * unitPrice;
  const afterDiscount = subtotal - (subtotal * discount) / 100;
  const lineTax = (afterDiscount * tax) / 100;
  return {
    productId: line.productId ?? null,
    description: line.description ?? 'Item',
    quantity,
    unitPrice,
    discount,
    tax,
    lineTotal: afterDiscount + lineTax,
  };
}

function mapQuotation(q: any) {
  return {
    ...q,
    quoteNumber: q.number,
    quotationNumber: q.number,
    total: q.total ?? q.grandTotal,
    lines: (q.lines || []).map((l: any) => ({
      id: l.id,
      productId: l.productId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discount,
      tax: l.tax,
      subtotal: l.lineTotal,
    })),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'view' });
    const { id } = await params;
    const q = await client.quotation.findFirst({
      where: { id, tenantId },
      include: { customer: true, lines: true },
    });
    if (!q) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    return NextResponse.json({ data: mapQuotation(q) });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch quotation' }, { status });
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
    const parsed = quotationUpdateSchema.parse(body);

    const existing = await client.quotation.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });

    let totals: any = {};
    let lines: any[] = [];
    let hasLines = false;
    if (Array.isArray(parsed.lines)) {
      lines = parsed.lines.map(calcLine);
      hasLines = true;
      totals.subtotal = lines.reduce((s: number, l: any) => s + l.quantity * l.unitPrice, 0);
      totals.discount = lines.reduce((s: number, l: any) => s + ((l.quantity * l.unitPrice) * (l.discount || 0)) / 100, 0);
      totals.tax = lines.reduce((s: number, l: any) => {
        const lineSubtotal = l.quantity * l.unitPrice;
        const afterDiscount = lineSubtotal - (lineSubtotal * (l.discount || 0)) / 100;
        return s + (afterDiscount * (l.tax || 0)) / 100;
      }, 0);
      totals.total = totals.subtotal - totals.discount + totals.tax;
      totals.grandTotal = parsed.grandTotal ?? totals.total;
      await client.legacyQuotationLine.deleteMany({ where: { quotationId: id, tenantId } });
    }

    const q = await client.quotation.update({
      where: { id },
      data: {
        ...(parsed.status !== undefined && { status: parsed.status }),
        ...(parsed.customerId !== undefined && { customerId: parsed.customerId }),
        ...(parsed.validUntil !== undefined && { validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null }),
        ...(parsed.notes !== undefined && { notes: parsed.notes }),
        ...(parsed.termsAndConditions !== undefined && { termsAndConditions: parsed.termsAndConditions }),
        ...(parsed.branchId !== undefined && { branchId: parsed.branchId }),
        ...(parsed.currency !== undefined && { currency: parsed.currency }),
        ...(parsed.quoteNumber !== undefined && { number: parsed.quoteNumber }),
        ...(hasLines ? totals : {}),
        ...(hasLines
          ? {
            lines: {
              create: lines.map((l: any) => ({
                tenantId,
                productId: l.productId,
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                discount: l.discount,
                tax: l.tax,
                lineTotal: l.lineTotal,
              })),
            },
          }
          : {}),
      },
      include: { customer: true, lines: true },
    });

    return NextResponse.json({ data: mapQuotation(q) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to update quotation' }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'delete' });
    const { id } = await params;
    const existing = await client.quotation.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    await client.quotation.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to delete quotation' }, { status });
  }
}
