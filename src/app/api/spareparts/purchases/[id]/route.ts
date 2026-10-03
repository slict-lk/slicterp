import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{
        id: string;
    }>
}

// GET /api/spareparts/purchases/[id] - Get single purchase order
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const purchaseOrder = await prisma.shopPurchaseOrder.findFirst({
            where: {
                id,
                tenantId: user.tenantId,
            },
            include: {
                supplier: true,
                items: true,
            }
        });

        if (!purchaseOrder) {
            return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
        }

        return NextResponse.json(purchaseOrder);
    } catch (error) {
        console.error('Error fetching purchase order:', error);
        return NextResponse.json({ error: 'Failed to fetch purchase order' }, { status: 500 });
    }
}
