import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

// GET /api/inventory/alerts
export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();

        // Find products where stock is <= minStockQty (do post-filter since prisma lte fields might not be widely supported depending on version)
        const products = await prisma.invProduct.findMany({
            where: {
                tenantId: tenant.id,
                isActive: true,
                type: 'STORABLE',
                minStockQty: { gt: 0 }
            },
            orderBy: { stockQty: 'asc' }
        });

        const alerts = products.filter(p => Number(p.stockQty) <= Number(p.minStockQty));

        // Also we might want to flag things that have no minStockQty but are just low
        // For now we rely on explicit minStockQty being set.

        return NextResponse.json(alerts);
    } catch (error) {
        console.error('Error fetching inventory alerts:', error);
        return NextResponse.json({ error: 'Failed to fetch inventory alerts' }, { status: 500 });
    }
}
