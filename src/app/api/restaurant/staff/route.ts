import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        const { searchParams } = new URL(request.url);
        const unassigned = searchParams.get('unassigned');

        if (unassigned === 'true') {
            // Find users who are not yet restaurant staff
            const existingStaff = await (prisma as any).restaurantStaff.findMany({
                where: { tenantId },
                select: { userId: true }
            });

            const staffUserIds = existingStaff.map((s: any) => s.userId);

            const availableUsers = await prisma.user.findMany({
                where: {
                    tenantId,
                    id: { notIn: staffUserIds }
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    role: true
                }
            });

            return NextResponse.json(availableUsers);
        }

        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

    } catch (error) {
        console.error('Error fetching staff/users:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        const { userId, role } = await request.json();

        if (!userId || !role) {
            return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
        }

        const newStaff = await (prisma as any).restaurantStaff.create({
            data: {
                userId,
                role,
                tenantId
            }
        });

        return NextResponse.json(newStaff);
    } catch (error) {
        console.error('Error registering staff:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
