import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Fetch tables for capacity calculation
        const tables = await prisma.restaurantTable.findMany({
            where: { tenantId }
        });
        const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
        const occupiedCapacity = tables
            .filter(t => ['OCCUPIED', 'RESERVED'].includes(t.status))
            .reduce((sum, t) => sum + t.capacity, 0);
        const capacityPercentage = totalCapacity > 0 ? Math.round((occupiedCapacity / totalCapacity) * 100) : 0;

        // Fetch today's orders
        const todaysOrders = await prisma.pOSOrder.findMany({
            where: {
                tenantId,
                createdAt: {
                    gte: startOfDay,
                }
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        const activeStatuses = ['PENDING', 'PREPARING', 'READY_TO_SERVE'];

        const activeOrders = todaysOrders.filter(o => activeStatuses.includes(o.status));
        const paidOrders = todaysOrders.filter(o => o.status === 'PAID' || o.status === 'COMPLETED');

        const dailySales = paidOrders.reduce((sum, order) => sum + order.total, 0);

        const activeTicketsCount = activeOrders.length;

        // Recently sent orders that are NOT yet served
        const recentTickets = activeOrders
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 5);

        return NextResponse.json({
            activeTickets: activeTicketsCount,
            dailySales,
            completedOrders: paidOrders.length,
            capacityPercentage,
            recentTickets
        });

    } catch (error) {
        console.error('Error fetching restaurant stats:', error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}
