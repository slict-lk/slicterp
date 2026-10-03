import { NextRequest, NextResponse } from 'next/server';
import { createFulfillmentRequestV2 } from '@/apps/sales/canonical-api';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const fulfillmentSchema = z.object({
  requestNumber: z.string().optional(),
  status: z.string().optional(),
  fulfillmentType: z.string().optional(),
  warehouseId: z.string().optional(),
  branchId: z.string().optional(),
  markStatus: z.string().optional(),
  orderStatus: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'sales', action: 'edit' });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const validatedBody = fulfillmentSchema.parse(body);
    const result = await createFulfillmentRequestV2(tenantId, id, user.id, validatedBody);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const message = String(error?.message || '');
    const status = message.includes('Forbidden')
      ? 403
      : /invalid|approval|blocked|not found/i.test(message)
        ? 400
        : 500;
    return NextResponse.json(
      {
        error:
          status === 403
            ? 'Forbidden'
            : status === 500
              ? 'Failed to create fulfillment request'
              : message || 'Invalid request',
      },
      { status }
    );
  }
}
