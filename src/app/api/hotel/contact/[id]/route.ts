import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/hotel/contact/[id] - Get single inquiry
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const inquiry = await prisma.contactInquiry.findUnique({
            where: { id }
        });

        if (!inquiry) {
            return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
        }

        return NextResponse.json(inquiry);
    } catch (error: any) {
        console.error('Error fetching inquiry:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/hotel/contact/[id] - Update inquiry status
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const updateData: any = {};
        if (body.status) updateData.status = body.status;
        if (body.assignedTo) updateData.assignedTo = body.assignedTo;
        if (body.notes) updateData.notes = body.notes;
        if (body.status === 'REPLIED') updateData.repliedAt = new Date();

        const inquiry = await prisma.contactInquiry.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(inquiry);
    } catch (error: any) {
        console.error('Error updating inquiry:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/hotel/contact/[id] - Delete inquiry
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.contactInquiry.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting inquiry:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
