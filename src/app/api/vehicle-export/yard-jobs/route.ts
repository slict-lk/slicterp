import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/vehicle-export/yard-jobs - List yard jobs (Module D)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const vehicleId = searchParams.get('vehicleId');

        const where: any = { tenantId };

        if (status && status !== 'all') {
            where.status = status;
        }

        if (vehicleId) {
            where.vehicleId = vehicleId;
        }

        const jobs = await prisma.yardJob.findMany({
            where,
            include: {
                vehicle: {
                    select: {
                        id: true,
                        stockNumber: true,
                        make: true,
                        model: true,
                        year: true,
                        location: true,
                    },
                },
                materials: true,
            },

            orderBy: [
                { status: 'asc' }, // TODO first, then IN_PROGRESS, then DONE
                { createdAt: 'desc' },
            ],
        });

        return NextResponse.json({ jobs });
    } catch (error) {
        console.error('Yard jobs fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch yard jobs' }, { status: 500 });
    }
}

// POST /api/vehicle-export/yard-jobs - Create yard job (REQ-D1)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const body = await request.json();

        const job = await prisma.yardJob.create({
            data: {
                tenantId,
                vehicleId: body.vehicleId,
                title: body.title,
                type: body.type || 'REPAIR',
                assignedTo: body.assignedTo,
                notes: body.notes,
                status: 'TODO',
                proofPhotos: [],
            },
            include: {
                vehicle: {
                    select: { stockNumber: true, make: true, model: true },
                },
            },
        });

        return NextResponse.json({ job }, { status: 201 });
    } catch (error) {
        console.error('Yard job create error:', error);
        return NextResponse.json({ error: 'Failed to create yard job' }, { status: 500 });
    }
}
