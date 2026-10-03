import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const tenant = await getOrCreateDefaultTenant();

        const admission = await prisma.admission.findFirst({
            where: { id, tenantId: tenant.id },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        patientNumber: true,
                        dateOfBirth: true,
                        gender: true,
                        bloodGroup: true,
                        phone: true,
                        allergies: true,
                        chronicConditions: true,
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
                },
                charges: {
                    orderBy: { chargeDate: 'desc' },
                },
            },
        });

        if (!admission) {
            return NextResponse.json(
                { error: 'Admission not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(admission);
    } catch (error) {
        console.error('Error fetching admission:', error);
        return NextResponse.json(
            { error: 'Failed to fetch admission' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await request.json();

        const admission = await prisma.admission.update({
            where: { id },
            data: {
                status: data.status,
                dischargeDate: data.dischargeDate ? new Date(data.dischargeDate) : undefined,
                dischargeNotes: data.dischargeNotes,
                totalCharges: data.totalCharges,
                invoiceId: data.invoiceId,
            },
        });

        // If discharging, update bed status to available
        if (data.status === 'DISCHARGED') {
            await prisma.hospitalBed.update({
                where: { id: admission.bedId },
                data: { status: 'AVAILABLE' },
            });
        }

        return NextResponse.json(admission);
    } catch (error) {
        console.error('Error updating admission:', error);
        return NextResponse.json(
            { error: 'Failed to update admission' },
            { status: 500 }
        );
    }
}
