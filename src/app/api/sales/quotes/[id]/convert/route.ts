import { NextRequest, NextResponse } from 'next/server';
import { convertSalesQuoteToOrderV2 } from '@/apps/sales/canonical-api';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const convertSchema = z.object({
  branchId: z.string().optional(),
  customerAccountId: z.string().optional(),
  opportunityId: z.string().optional(),
  orderNumber: z.string().optional(),
  status: z.string().optional(),
  approvalStatus: z.string().optional(),
  fulfillmentStatus: z.string().optional(),
  invoiceStatus: z.string().optional(),
  currency: z.string().optional(),
  exchangeRate: z.number().optional(),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  incoterms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  paymentTermsDays: z.number().optional(),
  notes: z.string().optional(),
  allowDuplicateConversion: z.boolean().optional(),
  markQuoteStatus: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'sales', action: 'create' });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const validatedBody = convertSchema.parse(body);
    const result = await convertSalesQuoteToOrderV2(tenantId, id, user.id, validatedBody);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const message = String(error?.message || '');
    const status = message.includes('Forbidden')
      ? 403
      : /not found/i.test(message)
        ? 404
        : /already converted|invalid|approval|credit|threshold|inactive|exceed/i.test(message)
          ? 400
          : 500;
    return NextResponse.json(
      {
        error:
          status === 403
            ? 'Forbidden'
            : status === 500
              ? 'Failed to convert quote'
              : message || 'Invalid request',
      },
      { status }
    );
  }
}
