
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPublicApiAuthorized } from '@/lib/public-api-auth';

export const dynamic = 'force-dynamic';

// GET /api/public/export/config
export async function GET(request: NextRequest) {
    // 1. Auth Check
    const authHeader = request.headers.get('authorization');
    if (!isPublicApiAuthorized(authHeader)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Tenant ID
    // In a real multi-tenant public API, the frontend might send a 'X-Tenant-ID' header
    // or the API Key might be mapped to a tenant. 
    // For this ERP, let's assume we maintain the context via a query param or header?
    // OR, if this ERP is single-tenant for the public site, we just fetch the first/only config?
    // Let's check query param `tenantId`.
    const { searchParams } = new URL(request.url);
    let tenantId = searchParams.get('tenantId');
    const subdomain = searchParams.get('subdomain');

    if (!tenantId && !subdomain) {
        return NextResponse.json({ error: 'Tenant ID or Subdomain required' }, { status: 400 });
    }

    // Resolve subdomain to tenantId if needed
    // Resolve subdomain to tenantId if needed
    if (!tenantId && subdomain) {
        const tenant = await prisma.tenant.findFirst({
            where: {
                OR: [
                    { subdomain: subdomain },
                    { domain: subdomain }
                ]
            },
            select: { id: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }
        tenantId = tenant.id;
    }

    try {
        let config = await prisma.exportStoreConfig.findUnique({
            where: { tenantId: tenantId! },
        });

        if (!config) {
            // Auto-create default config for this tenant
            config = await prisma.exportStoreConfig.create({
                data: {
                    tenantId: tenantId!,
                    storeName: 'Vehicle Export',
                    primaryColor: '#c62828',
                },
            });
        }

        return NextResponse.json(config);
    } catch (error) {
        console.error('Config fetch error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
