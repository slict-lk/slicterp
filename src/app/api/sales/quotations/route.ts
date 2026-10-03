import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

const client = prisma as any;
export const dynamic = 'force-dynamic';

const quotationLineSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  discount: z.number().optional(),
  tax: z.number().optional(),
  lineTotal: z.number().optional(),
}).passthrough();

const quotationCreateSchema = z.object({
  quoteNumber: z.string().optional(),
  quotationNumber: z.string().optional(),
  status: z.string().optional(),
  validUntil: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  grandTotal: z.number().optional(),
  notes: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  currency: z.string().optional(),
  lines: z.array(quotationLineSchema).optional(),
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
    customer: q.customer ?? null,
    customerName: q.customer?.name ?? null,
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

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'view' });
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const customerId = searchParams.get('customerId');

    const quotations = await client.quotation.findMany({
      where: {
        tenantId,
        ...(statusParam && { status: statusParam }),
        ...(customerId && { customerId }),
      },
      include: {
        customer: true,
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = quotations.map(mapQuotation);
    return NextResponse.json({ items, metadata: { count: items.length } });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    console.error('Error fetching quotations:', error);
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch quotations' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'create' });
    const body = await request.json();
    const parsed = quotationCreateSchema.parse(body);

    const lines = (Array.isArray(parsed.lines) ? parsed.lines : []).map(calcLine);
    const subtotal = lines.reduce((s: number, l: any) => s + (l.quantity * l.unitPrice), 0);
    const discount = lines.reduce((s: number, l: any) => s + ((l.quantity * l.unitPrice) * (l.discount || 0)) / 100, 0);
    const tax = lines.reduce((s: number, l: any) => {
      const lineSubtotal = l.quantity * l.unitPrice;
      const afterDiscount = lineSubtotal - (lineSubtotal * (l.discount || 0)) / 100;
      return s + (afterDiscount * (l.tax || 0)) / 100;
    }, 0);
    const total = subtotal - discount + tax;

    const quotation = await client.quotation.create({
      data: {
        number: parsed.quoteNumber || parsed.quotationNumber || `QT-${Date.now()}`,
        status: parsed.status || 'DRAFT',
        validUntil: parsed.validUntil ? new Date(parsed.validUntil) : new Date(Date.now() + 30 * 86400000),
        customerId: parsed.customerId ?? null,
        subtotal,
        tax,
        discount,
        total,
        grandTotal: parsed.grandTotal ?? total,
        notes: parsed.notes ?? null,
        termsAndConditions: parsed.termsAndConditions ?? null,
        branchId: parsed.branchId ?? null,
        currency: parsed.currency ?? 'USD',
        tenantId,
        ...(lines.length > 0
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
      include: {
        customer: true,
        lines: true,
      },
    });

    return NextResponse.json({ data: mapQuotation(quotation) }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    console.error('Error creating quotation:', error);
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to create quotation' }, { status });
  }
}

