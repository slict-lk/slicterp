import { NextRequest, NextResponse } from 'next/server';
import { deleteSalesQuote, getSalesQuoteById, updateSalesQuote } from '@/apps/sales/canonical-api';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const quoteLineSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, 'Description is required').optional(),
  quantity: z.number().min(0.01).optional(),
  unitPrice: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
});

const quoteUpdateSchema = z.object({
  branchId: z.string().optional(),
  customerAccountId: z.string().optional(),
  opportunityId: z.string().optional(),
  quoteNumber: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED']).optional(),
  currency: z.string().length(3).optional(),
  validUntil: z.string().optional(),
  paymentTermsDays: z.number().min(0).optional(),
  notes: z.string().optional(),
  lines: z.array(quoteLineSchema).optional(),
}).passthrough();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'view' });
    const { id } = await params;
    const quote = await getSalesQuoteById(tenantId, id);
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: quote });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to fetch quote' }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'sales', action: 'edit' });
    const { id } = await params;
    const body = await request.json();
    const validated = quoteUpdateSchema.parse(body);

    const quote = await updateSalesQuote(tenantId, id, user.id, validated);
    return NextResponse.json({ data: quote });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    const message = /not found/i.test(error?.message || '') ? 'Not found' : status === 403 ? 'Forbidden' : 'Failed to update quote';
    return NextResponse.json({ error: message }, { status: message === 'Not found' ? 404 : status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'delete' });
    const { id } = await params;
    const result = await deleteSalesQuote(tenantId, id);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    const status = error?.message?.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to delete quote' }, { status });
  }
}

