import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        // Try to fetch staff
        let staff = await (prisma as any).restaurantStaff.findMany({
            where: { tenantId },
            include: {
                user: {
                    select: { name: true, avatar: true }
                },
                shifts: {
                    where: { status: 'OPEN' },
                    orderBy: { startTime: 'desc' },
                    take: 1
                }
            }
        });

        // If no staff, auto-provision the first user (usually the admin/current user) as staff for testing/demo
        if (staff.length === 0) {
            const firstUser = await prisma.user.findFirst({ where: { tenantId } });
            if (firstUser) {
                await prisma.restaurantStaff.create({
                    data: {
                        userId: firstUser.id,
                        role: 'Manager',
                        tenantId
                    }
                });
                // Fetch again
                staff = await prisma.restaurantStaff.findMany({
                    where: { tenantId },
                    include: {
                        user: {
                            select: { name: true, avatar: true }
                        },
                        shifts: {
                            where: { status: 'OPEN' },
                            orderBy: { startTime: 'desc' },
                            take: 1
                        }
                    }
                });
            }
        }

        return NextResponse.json(staff);
    } catch (error) {
        console.error('Error fetching shifts:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { staffId, action } = await request.json();

        if (action === 'CLOCK_IN') {
            await (prisma as any).restaurantShift.updateMany({
                where: { staffId, status: 'OPEN', tenantId },
                data: { status: 'CLOSED', endTime: new Date() }
            });

            const newShift = await (prisma as any).restaurantShift.create({
                data: {
                    staffId,
                    status: 'OPEN',
                    tenantId
                }
            });
            await publishModuleMutationEvent({
                tenantId,
                module: 'restaurant',
                entity: 'shift',
                event: 'clocked_in',
                actorId: 'restaurant-shift-api',
                payload: {
                    staffId,
                    shiftId: newShift.id,
                    status: newShift.status,
                },
            });
            return NextResponse.json(newShift);
        } else if (action === 'CLOCK_OUT') {
            const activeShift = await (prisma as any).restaurantShift.findFirst({
                where: { staffId, status: 'OPEN', tenantId }
            });

            if (!activeShift) return NextResponse.json({ error: 'No active shift' }, { status: 400 });

            const updatedShift = await (prisma as any).restaurantShift.update({
                where: { id: activeShift.id },
                data: {
                    status: 'CLOSED',
                    endTime: new Date()
                }
            });
            await publishModuleMutationEvent({
                tenantId,
                module: 'restaurant',
                entity: 'shift',
                event: 'clocked_out',
                actorId: 'restaurant-shift-api',
                payload: {
                    staffId,
                    shiftId: updatedShift.id,
                    status: updatedShift.status,
                },
            });
            return NextResponse.json(updatedShift);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error updating shift:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
