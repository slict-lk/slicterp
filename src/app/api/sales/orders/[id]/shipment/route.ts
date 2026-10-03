import { NextRequest, NextResponse } from 'next/server';
import { FulfillmentService } from '@/apps/sales/fulfillment-service';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const shipmentSchema = z.object({
    requestId: z.string().min(1, 'requestId is required'),
    shippedLines: z.array(z.object({
        lineId: z.string().min(1),
        quantity: z.number().min(0),
    })).min(1, 'shippedLines must not be empty'),
    createBackorder: z.boolean().optional().default(false),
});

/**
 * POST /api/sales/orders/[id]/shipment
 * Records a shipment against a fulfillment request and optionally creates a backorder.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'edit' });
        const { id: orderId } = await params;
        const body = await request.json().catch(() => ({}));

        const validated = shipmentSchema.parse(body);

        const result = await FulfillmentService.recordShipment(
            tenantId,
            validated.requestId,
            validated.shippedLines,
            {
                createBackorder: validated.createBackorder,
                expectedOrderId: orderId
            }
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Failed to record shipment' }, { status: 400 });
        }

        return NextResponse.json({ data: { success: true } });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
        }
        const status = error?.message?.includes('Forbidden') ? 403 : 500;
        console.error('Error recording shipment:', error);
        return NextResponse.json({ error: status === 403 ? 'Forbidden' : 'Failed to record shipment' }, { status });
    }
}
