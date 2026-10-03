import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/vehicle-export/dashboard - Dashboard stats
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Get counts by status
        const [
            pendingBids,
            approvedBids,
            inYard,
            readyToShip,
            shipped,
            delivered,
            pendingYardJobs,
            totalVehicles,
        ] = await Promise.all([
            prisma.exportBid.count({ where: { tenantId, status: 'PENDING' } }),
            prisma.exportBid.count({ where: { tenantId, status: 'APPROVED' } }),
            prisma.exportVehicle.count({ where: { tenantId, status: 'IN_YARD' } }),
            prisma.exportVehicle.count({ where: { tenantId, status: 'READY_TO_SHIP' } }),
            prisma.exportVehicle.count({ where: { tenantId, status: 'SHIPPED' } }),
            prisma.exportVehicle.count({ where: { tenantId, status: 'DELIVERED' } }),
            prisma.yardJob.count({ where: { tenantId, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
            prisma.exportVehicle.count({ where: { tenantId } }),
        ]);

        // Recent activity (last 5 vehicles)
        const recentVehicles = await prisma.exportVehicle.findMany({
            where: { tenantId },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            select: {
                id: true,
                stockNumber: true,
                make: true,
                model: true,
                status: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({
            stats: {
                pendingBids,
                approvedBids,
                inYard,
                readyToShip,
                shipped,
                delivered,
                pendingYardJobs,
                totalVehicles,
            },
            recentVehicles,
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
    }
}
