import { NextRequest, NextResponse } from 'next/server';
import { getLabOrders } from '@/apps/healthcare/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || undefined;
        const visitId = searchParams.get('visitId') || undefined;

        const labOrders = await getLabOrders(tenantId, { status, visitId });
        return NextResponse.json({ labOrders });
    } catch (error) {
        console.error('Error fetching lab orders:', error);
        return NextResponse.json(
            { error: 'Failed to fetch lab orders' },
            { status: 500 }
        );
    }
}
