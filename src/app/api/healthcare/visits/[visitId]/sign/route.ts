import { NextRequest, NextResponse } from 'next/server';
import { signPrescriptions, updateVisit } from '@/apps/healthcare/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

// Sign all prescriptions for this visit
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ visitId: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { visitId } = await params;

        // Sign all prescriptions
        const result = await signPrescriptions(visitId, tenantId);

        // Update visit with doctor signature
        await updateVisit(visitId, {
            doctorSignature: `Signed on ${new Date().toISOString()}`,
        }, tenantId);

        return NextResponse.json({
            success: true,
            message: 'Prescriptions signed successfully',
            count: result.count,
        });
    } catch (error) {
        console.error('Error signing prescriptions:', error);
        return NextResponse.json(
            { error: 'Failed to sign prescriptions' },
            { status: 500 }
        );
    }
}
