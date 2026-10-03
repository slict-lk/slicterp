import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();

        // ABC Analysis: Grouping items by their consumption value over the last 90 days.
        // A: Top 80% of value
        // B: Next 15%
        // C: Bottom 5%

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const movements = await prisma.invStockMovement.groupBy({
            by: ['productId'],
            where: {
                tenantId: tenant.id,
                type: 'OUT',
                direction: -1,
                date: { gte: ninetyDaysAgo }
            },
            _sum: {
                totalCost: true,
                quantity: true
            }
        });

        const totalConsumptionValue = movements.reduce((sum, move) => sum + Number(move._sum.totalCost || 0), 0);

        // Get product metadata
        const productIds = movements.map(m => m.productId);
        const products = await prisma.invProduct.findMany({
            where: { id: { in: productIds } },
            select: { id: true, sku: true, name: true, stockQty: true }
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        // Sort descending by value
        const sorted = movements
            .map(m => ({
                productId: m.productId,
                product: productMap.get(m.productId),
                consumptionValue: Number(m._sum.totalCost || 0),
                consumptionQty: Number(m._sum.quantity || 0)
            }))
            .sort((a, b) => b.consumptionValue - a.consumptionValue);

        let runningTotal = 0;
        const classified = sorted.map(item => {
            runningTotal += item.consumptionValue;
            const cumulativePct = totalConsumptionValue > 0 ? (runningTotal / totalConsumptionValue) * 100 : 0;
            const percentOfTotalValue = totalConsumptionValue > 0 ? (item.consumptionValue / totalConsumptionValue) * 100 : 0;

            let classification = 'C';
            if (cumulativePct <= 80) classification = 'A';
            else if (cumulativePct <= 95) classification = 'B';

            return {
                ...item,
                productName: item.product?.name || 'Unknown',
                percentOfTotalValue,
                cumulativePct,
                classification
            };
        });

        return NextResponse.json({
            totalConsumptionValue,
            analysisPeriodDays: 90,
            data: classified,
            items: classified
        });
    } catch (error) {
        console.error('Error fetching inventory ABC:', error);
        return NextResponse.json({ error: 'Failed to generate ABC analysis' }, { status: 500 });
    }
}
