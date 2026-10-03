import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();

        const products = await prisma.invProduct.findMany({
            where: {
                tenantId: tenant.id,
                type: 'STORABLE',
            },
            select: {
                id: true,
                sku: true,
                name: true,
                category: {
                    select: {
                        name: true
                    }
                },
                stockQty: true,
                costPrice: true
            }
        });

        const valuation = products.map(p => ({
            id: p.id,
            productName: p.name,
            category: p.category?.name || '—',
            stockQty: Number(p.stockQty),
            averageCost: Number(p.costPrice),
            totalValue: Number(p.stockQty) * Number(p.costPrice)
        }));

        const totalPortfolioValue = valuation.reduce((sum, item) => sum + item.totalValue, 0);

        const sortedData = valuation.sort((a, b) => b.totalValue - a.totalValue);
        return NextResponse.json({
            summary: { totalPortfolioValue, trackedItems: products.length },
            data: sortedData,
            items: sortedData
        });
    } catch (error) {
        console.error('Error fetching inventory valuation:', error);
        return NextResponse.json({ error: 'Failed to generate inventory valuation report' }, { status: 500 });
    }
}
