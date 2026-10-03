import { NextRequest, NextResponse } from 'next/server';
import { getVisits, createVisit } from '@/apps/healthcare/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        const { searchParams } = new URL(request.url);
        const today = searchParams.get('today') === 'true';
        const status = searchParams.get('status') || undefined;
        const doctorId = searchParams.get('doctorId') || undefined;

        const visits = await getVisits(tenantId, { today, status, doctorId });
        return NextResponse.json({ visits });
    } catch (error) {
        console.error('Error fetching visits:', error);
        return NextResponse.json(
            { error: 'Failed to fetch visits' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const data = await request.json();

        if (!data.patientId) {
            return NextResponse.json(
                { error: 'Patient ID is required' },
                { status: 400 }
            );
        }

        if (!data.type || !['OPD', 'ETU', 'CLINIC'].includes(data.type)) {
            return NextResponse.json(
                { error: 'Valid visit type (OPD, ETU, CLINIC) is required' },
                { status: 400 }
            );
        }

        const visit = await createVisit({
            patientId: data.patientId,
            type: data.type,
            doctorId: data.doctorId,
            tenantId,
        });

        return NextResponse.json(visit, { status: 201 });
    } catch (error) {
        console.error('Error creating visit:', error);
        return NextResponse.json(
            { error: 'Failed to create visit' },
            { status: 500 }
        );
    }
}
