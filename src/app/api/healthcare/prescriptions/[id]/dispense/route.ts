import { NextRequest, NextResponse } from 'next/server';
import { dispensePrescription } from '@/apps/healthcare/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { id } = await params;

        // Use the current user ID as the dispenser
        // In production, this would come from the session
        const dispensedBy = 'pharmacy-user';

        const prescription = await dispensePrescription(id, dispensedBy, tenantId);

        return NextResponse.json({
            success: true,
            message: 'Prescription dispensed successfully',
            prescription,
        });
    } catch (error) {
        console.error('Error dispensing prescription:', error);
        const message = error instanceof Error ? error.message : 'Failed to dispense prescription';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
