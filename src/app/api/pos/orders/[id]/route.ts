import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { id } = await params;

        const data = await request.json();

        if (!data.status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        const updatedOrder = await prisma.pOSOrder.update({
            where: {
                id,
                tenantId
            },
            data: {
                status: data.status
            }
        });

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('Error updating order status:', error);
        return NextResponse.json(
            { error: 'Failed to update order status' },
            { status: 500 }
        );
    }
}
