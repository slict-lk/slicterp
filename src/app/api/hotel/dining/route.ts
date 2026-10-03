import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/hotel/dining - List dining venues (public)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const activeOnly = searchParams.get('activeOnly') !== 'false';

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
        }

        const where: any = { tenantId };
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

// POST /api/hotel/dining - Create dining venue (admin)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tenantId,
            name,
            description,
            cuisine,
            dressCode,
            openingHours,
            priceRange,
            images,
            menuUrl,
            phone,
            capacity,
            location,
            isActive,
            isFeatured,
            sortOrder,
            branchId
        } = body;

        if (!tenantId || !name) {
            return NextResponse.json({ error: 'Tenant ID and name are required' }, { status: 400 });
        }

        // Generate slug from name
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const venue = await prisma.diningVenue.create({
            data: {
                tenantId,
                name,
                slug,
                description,
                cuisine,
                dressCode,
                openingHours,
                priceRange,
                images: images || [],
                menuUrl,
                location,
                phone,
                capacity: capacity ? parseInt(capacity) : null,
                isActive: isActive ?? true,
                isFeatured: isFeatured ?? false,
                sortOrder: sortOrder ?? 0,
                branchId
            },
        });

        return NextResponse.json(venue, { status: 201 });
    } catch (error: any) {
        console.error('Error creating dining venue:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
