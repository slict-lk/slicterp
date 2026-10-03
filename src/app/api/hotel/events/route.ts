import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/hotel/events - List events (public)
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

        const where: any = { tenantId };
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

// POST /api/hotel/events - Create event (admin)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tenantId,
            title,
            description,
            category,
            date,
            endDate,
            time,
            location,
            images,
            price,
            capacity,
            isPublished,
            isFeatured,
            branchId
        } = body;

        if (!tenantId || !title || !date) {
            return NextResponse.json({ error: 'Tenant ID, title, and date are required' }, { status: 400 });
        }

        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const event = await prisma.hotelEvent.create({
            data: {
                tenantId,
                title,
                slug,
                description,
                category,
                date: new Date(date),
                endDate: endDate ? new Date(endDate) : null,
                time,
                location,
                images: images || [],
                price: parseFloat(price) || 0,
                capacity: capacity ? parseInt(capacity) : null,
                isPublished: isPublished ?? false,
                isFeatured: isFeatured ?? false,
                branchId
            },
        });

        return NextResponse.json(event, { status: 201 });
    } catch (error: any) {
        console.error('Error creating event:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
