import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/public/hotel/events
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const category = searchParams.get('category');
        const upcoming = searchParams.get('upcoming') !== 'false';
        const publishedOnly = searchParams.get('publishedOnly') !== 'false';

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
        if (publishedOnly) where.isPublished = true;
        if (category) where.category = category;
        if (upcoming) where.date = { gte: new Date() };

        const events = await prisma.hotelEvent.findMany({
            where,
            include: {
                _count: {
                    select: { registrations: true }
                }
            },
            orderBy: { date: 'asc' },
        });

        return NextResponse.json(events);
    } catch (error: any) {
        console.error('Error fetching events:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
