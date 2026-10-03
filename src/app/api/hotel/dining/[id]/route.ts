import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/hotel/dining/[id] - Get single venue
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');

        const venue = await prisma.diningVenue.findUnique({
            where: { id },
            include: {
                reservations: {
                    where: {
                        date: { gte: new Date() }
                    },
                    orderBy: { date: 'asc' },
                    take: 10
                }
            }
        });

        if (!venue) {
            return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
        }

        if (tenantId && venue.tenantId !== tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json(venue);
    } catch (error: any) {
        console.error('Error fetching dining venue:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/hotel/dining/[id] - Update venue
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const venue = await prisma.diningVenue.update({
            where: { id },
            data: {
                name: body.name,
                slug: body.name ? body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined,
                description: body.description,
                cuisine: body.cuisine,
                dressCode: body.dressCode,
                openingHours: body.openingHours,
                priceRange: body.priceRange,
                images: body.images,
                menuUrl: body.menuUrl,
                phone: body.phone,
                capacity: body.capacity ? parseInt(body.capacity) : null,
                isActive: body.isActive,
                isFeatured: body.isFeatured,
                sortOrder: body.sortOrder,
                branchId: body.branchId
            },
        });

        return NextResponse.json(venue);
    } catch (error: any) {
        console.error('Error updating dining venue:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/hotel/dining/[id] - Delete venue
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.diningVenue.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting dining venue:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
