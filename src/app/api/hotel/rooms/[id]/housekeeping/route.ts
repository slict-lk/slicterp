import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, updatedBy } = body;

        // Validate status enum
        const validStatuses = ['CLEAN', 'DIRTY', 'INSPECTED', 'OUT_OF_ORDER', 'IN_PROGRESS'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid housekeeping status' },
                { status: 400 }
            );
        }

        const room = await prisma.hotelRoom.update({
            where: { id },
            data: {
                housekeepingStatus: status as any,
                lastCleanedAt: status === 'CLEAN' ? new Date() : undefined,
                lastCleanedBy: status === 'CLEAN' ? updatedBy : undefined,
                lastInspectedAt: status === 'INSPECTED' ? new Date() : undefined,
            },
        });

        // Optionally create a task log if status changed to DIRTY (check-out flow usually handles this, but good for manual updates)
        if (status === 'DIRTY') {
            await prisma.housekeepingTask.create({
                data: {
                    roomId: id,
                    taskType: 'STAYOVER', // Default to stayover if manually marked dirty
                    status: 'PENDING',
                    tenantId: room.tenantId,
                    branchId: room.branchId,
                }
            });
        }

        return NextResponse.json(room);
    } catch (error) {
        console.error('Failed to update housekeeping status:', error);
        return NextResponse.json(
            { error: 'Failed to update status' },
            { status: 500 }
        );
    }
}
