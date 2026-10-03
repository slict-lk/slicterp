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

        // Group by category to get distinct list
        const categories = await prisma.sparePart.groupBy({
            by: ['category'],
            where: {
                tenantId: tenant.id,
                isActive: true,
                category: { not: null }
            },
            _count: {
                category: true
            }
        });

        // Map to { name, count }
        const result = categories
            .map(c => ({
                name: c.category,
                count: c._count.category,
                slug: c.category?.toLowerCase().replace(/\s+/g, '-')
            }))
            .filter(c => c.name)
            .sort((a, b) => b.count - a.count); // Most popular first

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
