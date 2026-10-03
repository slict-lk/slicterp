import { NextRequest, NextResponse } from 'next/server';
import { getVisitById, updateVisit } from '@/apps/healthcare/api';
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

        const visit = await getVisitById(visitId, tenantId);

        if (!visit) {
            return NextResponse.json(
                { error: 'Visit not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(visit);
    } catch (error) {
        console.error('Error fetching visit:', error);
        return NextResponse.json(
            { error: 'Failed to fetch visit' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ visitId: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { visitId } = await params;
        const data = await request.json();

        const visit = await updateVisit(visitId, data, tenantId);
        return NextResponse.json(visit);
    } catch (error) {
        console.error('Error updating visit:', error);
        return NextResponse.json(
            { error: 'Failed to update visit' },
            { status: 500 }
        );
    }
}
