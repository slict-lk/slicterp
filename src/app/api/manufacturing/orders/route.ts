import { NextRequest, NextResponse } from 'next/server';
import { getManufacturingOrders, createManufacturingOrder } from '@/apps/manufacturing/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const tenantId = tenant.id;
    
    const orders = await getManufacturingOrders(tenantId);
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching manufacturing orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manufacturing orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const tenantId = tenant.id;
    const data = await request.json();
    
    const order = await createManufacturingOrder({
      ...data,
      tenantId,
    });
    
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating manufacturing order:', error);
    return NextResponse.json(
      { error: 'Failed to create manufacturing order' },
      { status: 500 }
    );
  }
}
