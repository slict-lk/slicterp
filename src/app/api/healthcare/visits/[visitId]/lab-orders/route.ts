import { NextRequest, NextResponse } from 'next/server';
import { getLabOrders, createLabOrder } from '@/apps/healthcare/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ visitId: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { visitId } = await params;

        const labOrders = await getLabOrders(tenantId, { visitId });
        return NextResponse.json({ labOrders });
    } catch (error) {
        console.error('Error fetching lab orders:', error);
        return NextResponse.json(
            { error: 'Failed to fetch lab orders' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ visitId: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { visitId } = await params;
        const data = await request.json();

        if (!data.labTestId) {
            return NextResponse.json(
                { error: 'Lab test ID is required' },
                { status: 400 }
            );
        }

        const labOrder = await createLabOrder({
            visitId,
            labTestId: data.labTestId,
            priority: data.priority || 'NORMAL',
            tenantId,
        });

        return NextResponse.json(labOrder, { status: 201 });
    } catch (error) {
        console.error('Error creating lab order:', error);
        return NextResponse.json(
            { error: 'Failed to create lab order' },
            { status: 500 }
        );
    }
}
