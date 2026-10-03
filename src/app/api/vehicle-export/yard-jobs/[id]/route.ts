import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/vehicle-export/yard-jobs/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const job = await prisma.yardJob.findFirst({
            where: { id, tenantId: session.user.tenantId },
            include: {
                vehicle: true,
            },
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        return NextResponse.json({ job });
    } catch (error) {
        console.error('Yard job fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch yard job' }, { status: 500 });
    }
}

// PUT /api/vehicle-export/yard-jobs/[id] - Update job status (REQ-D3, REQ-D4)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        const updateData: any = {};

        // Status update (REQ-D3)
        if (body.status) {
            updateData.status = body.status;
            if (body.status === 'DONE') {
                updateData.completedAt = new Date();
            }
        }

        // Notes
        if (body.notes !== undefined) {
            updateData.notes = body.notes;
        }

        // Photo upload (REQ-D4)
        if (body.proofPhotos) {
            updateData.proofPhotos = body.proofPhotos;
        }

        // Assigned to
        if (body.assignedTo !== undefined) {
            updateData.assignedTo = body.assignedTo;
        }

        const job = await prisma.yardJob.update({
            where: { id },
            data: updateData,
            include: {
                vehicle: {
                    select: { stockNumber: true, make: true, model: true },
                },
            },
        });

        // If all yard jobs for this vehicle are done, update vehicle status to IN_YARD
        if (body.status === 'DONE') {
            const pendingJobs = await prisma.yardJob.count({
                where: {
                    vehicleId: job.vehicleId,
                    status: { in: ['TODO', 'IN_PROGRESS'] },
                },
            });

            if (pendingJobs === 0) {
                await prisma.exportVehicle.update({
                    where: { id: job.vehicleId },
                    data: { status: 'READY_TO_SHIP' },
                });
            }
        }

        return NextResponse.json({ job });
    } catch (error) {
        console.error('Yard job update error:', error);
        return NextResponse.json({ error: 'Failed to update yard job' }, { status: 500 });
    }
}
