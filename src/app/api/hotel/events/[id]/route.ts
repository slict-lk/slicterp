import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/hotel/events/[id] - Get single event
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const event = await prisma.hotelEvent.findUnique({
            where: { id },
            include: {
                registrations: {
                    orderBy: { createdAt: 'desc' },
                    take: 20
                },
                _count: {
                    select: { registrations: true }
                }
            }
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json(event);
    } catch (error: any) {
        console.error('Error fetching event:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/hotel/events/[id] - Update event
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const event = await prisma.hotelEvent.update({
            where: { id },
            data: {
                title: body.title,
                slug: body.title ? body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined,
                description: body.description,
                category: body.category,
                date: body.date ? new Date(body.date) : undefined,
                endDate: body.endDate ? new Date(body.endDate) : null,
                time: body.time,
                location: body.location,
                images: body.images,
                price: body.price !== undefined ? parseFloat(body.price) : undefined,
                capacity: body.capacity ? parseInt(body.capacity) : null,
                isPublished: body.isPublished,
                isFeatured: body.isFeatured,
                branchId: body.branchId
            },
        });

        return NextResponse.json(event);
    } catch (error: any) {
        console.error('Error updating event:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/hotel/events/[id] - Delete event
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.hotelEvent.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting event:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
