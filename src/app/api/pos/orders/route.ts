import { NextRequest, NextResponse } from 'next/server';
import { getPOSOrders, createPOSOrder } from '@/apps/pos/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { recordSafeOperationalEvent } from '@/lib/intelligence/events/safe-operational-events';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const tenantId = tenant.id;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || undefined;
    
    const orders = await getPOSOrders(tenantId, sessionId);
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching POS orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch POS orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const tenantId = tenant.id;
    const data = await request.json();
    
    const order = await createPOSOrder({
      ...data,
      tenantId,
    });

    await recordSafeOperationalEvent({
      tenantId,
      moduleKey: 'pos',
      entityType: 'POS_ORDER',
      entityId: order.id,
      action: 'POS_ORDER_CREATED',
      metadata: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
        total: Number(order.total ?? order.totalAmount ?? 0),
        itemCount: order.items?.length ?? 0,
        customerId: order.customerId ?? null,
      },
    });
    
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating POS order:', error);
    return NextResponse.json(
      { error: 'Failed to create POS order' },
      { status: 500 }
    );
  }
}
