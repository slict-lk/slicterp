import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/public/hotel/dining
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const activeOnly = searchParams.get('activeOnly') !== 'false';

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
        }

        // Resolve Tenant (Handle Slug vs UUID)
        const tenant = await prisma.tenant.findFirst({
            where: {
                OR: [
                    { id: tenantId },
                    { subdomain: tenantId }
                ]
            }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const where: any = { tenantId: tenant.id };
        if (activeOnly) {
            where.isActive = true;
        }

        const venues = await prisma.diningVenue.findMany({
            where,
            include: {
                _count: {
                    select: { reservations: true }
                }
            },
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' }
            ],
        });

        return NextResponse.json(venues);
    } catch (error: any) {
        console.error('Error fetching dining venues:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
