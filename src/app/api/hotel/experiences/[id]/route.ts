import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/hotel/experiences/[id] - Get single experience
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const experience = await prisma.experience.findUnique({
            where: { id },
            include: {
                bookings: {
                    where: {
                        date: { gte: new Date() }
                    },
                    orderBy: { date: 'asc' },
                    take: 10
                }
            }
        });

        if (!experience) {
            return NextResponse.json({ error: 'Experience not found' }, { status: 404 });
        }

        return NextResponse.json(experience);
    } catch (error: any) {
        console.error('Error fetching experience:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/hotel/experiences/[id] - Update experience
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const experience = await prisma.experience.update({
            where: { id },
            data: {
                name: body.name,
                slug: body.name ? body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined,
                category: body.category,
                description: body.description,
                duration: body.duration,
                price: body.price !== undefined ? parseFloat(body.price) : undefined,
                images: body.images,
                includes: body.includes,
                requirements: body.requirements,
                maxParticipants: body.maxParticipants ? parseInt(body.maxParticipants) : null,
                isActive: body.isActive,
                isFeatured: body.isFeatured,
                sortOrder: body.sortOrder,
                branchId: body.branchId
            },
        });

        return NextResponse.json(experience);
    } catch (error: any) {
        console.error('Error updating experience:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/hotel/experiences/[id] - Delete experience
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.experience.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting experience:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
