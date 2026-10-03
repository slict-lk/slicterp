import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subdomain = searchParams.get('subdomain');

        if (!subdomain) {
            return NextResponse.json({ error: 'Subdomain required' }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { subdomain },
            select: { id: true }
        });

        if (!tenant) return NextResponse.json([], { status: 404 });

        const brands = await prisma.sparePart.groupBy({
            by: ['brand'],
            where: {
                tenantId: tenant.id,
                isActive: true,
                brand: { not: null }
            },
            _count: {
                brand: true
            }
        });

        const result = brands
            .map(b => ({
                name: b.brand,
                count: b._count.brand
            }))
            .filter(b => b.name)
            .sort((a, b) => a.name!.localeCompare(b.name!));

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error fetching brands:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
