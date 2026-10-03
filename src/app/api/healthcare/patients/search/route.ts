import { NextRequest, NextResponse } from 'next/server';
import { searchPatients } from '@/apps/healthcare/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';

        if (!query.trim()) {
            return NextResponse.json({ patients: [] });
        }

        const patients = await searchPatients(query, tenantId);
        return NextResponse.json({ patients });
    } catch (error) {
        console.error('Error searching patients:', error);
        return NextResponse.json(
            { error: 'Failed to search patients' },
            { status: 500 }
        );
    }
}
