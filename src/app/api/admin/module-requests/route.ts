'use server';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/module-requests - List all module requests (Super Admin only)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isSuperAdmin) {
            return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const where: any = {};
        if (status && status !== 'all') {
            where.status = status;
        }

        const requests = await prisma.moduleAccessRequest.findMany({
            where,
            include: {
                tenant: { select: { id: true, name: true, companyName: true } },
                requestedBy: { select: { id: true, name: true, email: true } },
                processedBy: { select: { id: true, name: true } },
            },
            orderBy: [
                { status: 'asc' }, // PENDING first
                { createdAt: 'desc' },
            ],
        });

        // Count by status
        const counts = await prisma.moduleAccessRequest.groupBy({
            by: ['status'],
            _count: { status: true },
        });

        const statusCounts = counts.reduce((acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            requests,
            counts: {
                PENDING: statusCounts.PENDING || 0,
                APPROVED: statusCounts.APPROVED || 0,
                REJECTED: statusCounts.REJECTED || 0,
                CANCELLED: statusCounts.CANCELLED || 0,
            },
        });
    } catch (error) {
        console.error('Admin module requests fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch module requests' }, { status: 500 });
    }
}
