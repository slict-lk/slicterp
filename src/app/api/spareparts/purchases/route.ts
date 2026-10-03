import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseOrders, createPurchaseOrder } from '@/apps/spareparts/api';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || undefined;

        const orders = await getPurchaseOrders(user.tenantId, { status });
        return NextResponse.json({ orders });
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        return NextResponse.json(
            { error: 'Failed to fetch purchase orders' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.supplierId || !body.items?.length) {
            return NextResponse.json(
                { error: 'Supplier and items are required' },
                { status: 400 }
            );
        }

        const order = await createPurchaseOrder({
            ...body,
            tenantId: user.tenantId,
            createdById: user.id,
            isTaxEnabled: body.isTaxEnabled,
        });

        try {
            await publishModuleMutationEvent({
                tenantId: user.tenantId,
                module: 'spareparts',
                entity: 'purchase-order',
                event: 'created',
                actorId: user.id,
                payload: {
                    purchaseOrderId: order.id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    total: Number(order.total || 0),
                },
            });
        } catch (publishError) {
            console.error('Failed to publish purchase-order mutation event:', { tenantId: user.tenantId, orderId: order.id, userId: user.id, error: publishError });
        }

        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        console.error('Error creating purchase order:', error);
        return NextResponse.json(
            { error: 'Failed to create purchase order' },
            { status: 500 }
        );
    }
}
