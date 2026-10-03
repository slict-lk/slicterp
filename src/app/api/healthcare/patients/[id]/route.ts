import { NextRequest, NextResponse } from 'next/server';
import { getPatientById, updatePatient } from '@/apps/healthcare/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { id } = await params;

        const patient = await getPatientById(id, tenantId);

        if (!patient) {
            return NextResponse.json(
                { error: 'Patient not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(patient);
    } catch (error) {
        console.error('Error fetching patient:', error);
        return NextResponse.json(
            { error: 'Failed to fetch patient' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { id } = await params;
        const data = await request.json();

        const patient = await updatePatient(id, data, tenantId);
        return NextResponse.json(patient);
    } catch (error) {
        console.error('Error updating patient:', error);
        return NextResponse.json(
            { error: 'Failed to update patient' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { id } = await params;

        // Soft delete - set status to INACTIVE
        await prisma.patient.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });

        return NextResponse.json({ success: true, message: 'Patient deactivated' });
    } catch (error) {
        console.error('Error deleting patient:', error);
        return NextResponse.json(
            { error: 'Failed to delete patient' },
            { status: 500 }
        );
    }
}
