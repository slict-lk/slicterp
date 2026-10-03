import { NextRequest, NextResponse } from 'next/server';
import { getPrescriptionsByVisit, createPrescription, signPrescriptions } from '@/apps/healthcare/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ visitId: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { visitId } = await params;

        const prescriptions = await getPrescriptionsByVisit(visitId, tenantId);
        return NextResponse.json({ prescriptions });
    } catch (error) {
        console.error('Error fetching prescriptions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch prescriptions' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ visitId: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { visitId } = await params;
        const data = await request.json();

        if (!data.medication || !data.dosage || !data.frequency || !data.duration) {
            return NextResponse.json(
                { error: 'Medication, dosage, frequency, and duration are required' },
                { status: 400 }
            );
        }

        const prescription = await createPrescription({
            visitId,
            medication: data.medication,
            dosage: data.dosage,
            frequency: data.frequency,
            duration: data.duration,
            instructions: data.instructions,
            quantity: data.quantity,
            productId: data.productId,
            tenantId,
        });

        return NextResponse.json(prescription, { status: 201 });
    } catch (error) {
        console.error('Error creating prescription:', error);
        return NextResponse.json(
            { error: 'Failed to create prescription' },
            { status: 500 }
        );
    }
}
