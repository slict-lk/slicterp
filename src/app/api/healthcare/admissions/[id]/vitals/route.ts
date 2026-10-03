import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: admissionId } = await params;
        const tenant = await getOrCreateDefaultTenant();

        const vitals = await prisma.vitalSign.findMany({
            where: { admissionId, tenantId: tenant.id },
            orderBy: { recordedAt: 'desc' },
        });

        return NextResponse.json({ vitals });
    } catch (error) {
        console.error('Error fetching vitals:', error);
        return NextResponse.json(
            { error: 'Failed to fetch vitals' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: admissionId } = await params;
        const tenant = await getOrCreateDefaultTenant();
        const data = await request.json();

        const vital = await prisma.vitalSign.create({
            data: {
                admissionId,
                temperature: data.temperature,
                bloodPressureSystolic: data.bloodPressureSystolic,
                bloodPressureDiastolic: data.bloodPressureDiastolic,
                pulse: data.pulse,
                respiratoryRate: data.respiratoryRate,
                oxygenSaturation: data.oxygenSaturation,
                notes: data.notes,
                recordedAt: new Date(),
                tenantId: tenant.id,
            },
        });

        return NextResponse.json(vital, { status: 201 });
    } catch (error) {
        console.error('Error creating vital signs:', error);
        return NextResponse.json(
            { error: 'Failed to record vital signs' },
            { status: 500 }
        );
    }
}
