import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/hotel/experiences - List experiences (public)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const category = searchParams.get('category');
        const activeOnly = searchParams.get('activeOnly') !== 'false';

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
        }

        const where: any = { tenantId };
        if (activeOnly) where.isActive = true;
        if (category) where.category = category;

        const experiences = await prisma.experience.findMany({
            where,
            include: {
                _count: {
                    select: { bookings: true }
                }
            },
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' }
            ],
        });

        return NextResponse.json(experiences);
    } catch (error: any) {
        console.error('Error fetching experiences:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/hotel/experiences - Create experience (admin)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tenantId,
            name,
            category,
            description,
            location,
            duration,
            price,
            images,
            includes,
            requirements,
            maxParticipants,
            isActive,
            isFeatured,
            sortOrder,
            branchId
        } = body;

        if (!tenantId || !name || !category) {
            return NextResponse.json({ error: 'Tenant ID, name, and category are required' }, { status: 400 });
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const experience = await prisma.experience.create({
            data: {
                tenantId,
                name,
                slug,
                category,
                description,
                location,
                duration,
                price: parseFloat(price) || 0,
                images: images || [],
                includes: includes || [],
                requirements,
                maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
                isActive: isActive ?? true,
                isFeatured: isFeatured ?? false,
                sortOrder: sortOrder ?? 0,
                branchId
            },
        });

        return NextResponse.json(experience, { status: 201 });
    } catch (error: any) {
        console.error('Error creating experience:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
