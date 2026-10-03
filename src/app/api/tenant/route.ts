import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/tenant?tenantId=...
 * Returns tenant details including subdomain
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');

        if (!tenantId) {
            return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
        }

        // Verify user belongs to this tenant
        const userTenantId = (session.user as any)?.tenantId;
        if (userTenantId !== tenantId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                id: true,
                name: true,
                subdomain: true,
                logo: true,
                primaryColor: true,
            }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        return NextResponse.json(tenant);
    } catch (error: any) {
        console.error('Error fetching tenant:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tenant' },
            { status: 500 }
        );
    }
}
