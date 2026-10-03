import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || undefined;

        const whereClause: Record<string, unknown> = { tenantId };
        if (status) whereClause.status = status;

        const admissions = await prisma.admission.findMany({
            where: whereClause,
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        patientNumber: true,
                    },
                },
                bed: {
                    include: {
                        ward: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                vitals: {
                    orderBy: { recordedAt: 'desc' },
                    take: 5,
                },
            },
            orderBy: { admissionDate: 'desc' },
        });

        return NextResponse.json({ admissions });
    } catch (error) {
        console.error('Error fetching admissions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch admissions' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const data = await request.json();

        if (!data.patientId || !data.bedId) {
            return NextResponse.json(
                { error: 'Patient ID and Bed ID are required' },
                { status: 400 }
            );
        }

        // Generate admission number
        const today = new Date();
        const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.admission.count({
            where: {
                tenantId,
                admissionNumber: { startsWith: `ADM-${datePrefix}` },
            },
        });
        const admissionNumber = `ADM-${datePrefix}-${String(count + 1).padStart(3, '0')}`;

        // Create admission and update bed status
        const [admission] = await prisma.$transaction([
            prisma.admission.create({
                data: {
                    admissionNumber,
                    patientId: data.patientId,
                    bedId: data.bedId,
                    originVisitId: data.visitId || null,
                    admissionDate: new Date(),
                    status: 'ADMITTED',
                    guardianName: data.guardianName || null,
                    guardianPhone: data.guardianPhone || null,
                    guardianRelation: data.guardianRelation || null,
                    depositAmount: data.depositAmount || 0,
                    tenantId,
                },
                include: {
                    patient: true,
                    bed: true,
                },
            }),
            prisma.hospitalBed.update({
                where: { id: data.bedId },
                data: { status: 'OCCUPIED' },
            }),
        ]);

        // Update visit status if provided
        if (data.visitId) {
            await prisma.medicalVisit.update({
                where: { id: data.visitId },
                data: { status: 'ADMITTED' },
            });
        }

        return NextResponse.json(admission, { status: 201 });
    } catch (error) {
        console.error('Error creating admission:', error);
        return NextResponse.json(
            { error: 'Failed to create admission' },
            { status: 500 }
        );
    }
}
