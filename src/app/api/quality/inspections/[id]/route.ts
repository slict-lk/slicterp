import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
        const { id } = await params;

        const inspection = await prisma.qualityInspection.findFirst({
            where: { id, tenantId },
        });

        if (!inspection) {
            return NextResponse.json(
                { error: 'Quality inspection not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(inspection);
    } catch (error: any) {
        console.error('Error fetching quality inspection:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await req.json();

        const inspection = await prisma.qualityInspection.update({
            where: { id },
            data,
        });

        return NextResponse.json(inspection);
    } catch (error: any) {
        console.error('Error updating quality inspection:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.qualityInspection.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Inspection deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting quality inspection:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
