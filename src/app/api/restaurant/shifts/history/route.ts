import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        const shifts = await (prisma as any).restaurantShift.findMany({
            where: { tenantId },
            include: {
                staff: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    }
                }
            },
            orderBy: { startTime: 'desc' },
            take: 50 // Get the last 50 shifts for performance
        });

        return NextResponse.json(shifts);
    } catch (error) {
        console.error('Error fetching shift history:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
