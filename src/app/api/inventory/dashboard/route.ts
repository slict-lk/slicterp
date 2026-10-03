import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();

        const [
            totalProducts,
            activeProducts,
            warehouses,
            alertProducts,
            recentMovements,
            pendingPOs
        ] = await Promise.all([
            prisma.invProduct.count({ where: { tenantId: tenant.id } }),
            prisma.invProduct.count({ where: { tenantId: tenant.id, isActive: true } }),
            prisma.invWarehouse.count({ where: { tenantId: tenant.id, isActive: true } }),
            prisma.invProduct.findMany({
                where: {
                    tenantId: tenant.id,
                    isActive: true,
                    type: 'STORABLE',
                },
                select: { stockQty: true, minStockQty: true }
            }).then(prods => prods.filter(p => Number(p.stockQty) <= Number(p.minStockQty)).length),
            prisma.invStockMovement.findMany({
                where: { tenantId: tenant.id },
                orderBy: { date: 'desc' },
                take: 10,
                include: { product: { select: { name: true, sku: true } } }
            }),
            prisma.purchaseOrder.count({
                where: { tenantId: tenant.id, status: { in: ['PENDING', 'APPROVED', 'PARTIAL'] } }
            })
        ]);

        // Value calculation
        const storableProducts = await prisma.invProduct.findMany({
            where: { tenantId: tenant.id, type: 'STORABLE' },
            select: { stockQty: true, costPrice: true }
        });
        const totalValue = storableProducts.reduce((sum, p) => sum + (Number(p.stockQty) * Number(p.costPrice)), 0);

        return NextResponse.json({
            kpis: {
                totalProducts,
                activeProducts,
                warehouses,
                alertProducts,
                pendingPOs,
                totalValue
            },
            recentMovements
        });
    } catch (error) {
        console.error('Error fetching inventory dashboard metrics:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
