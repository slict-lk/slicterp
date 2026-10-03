import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        const updateData: any = {
            status,
        };

        if (status === 'RESOLVED' || status === 'CLOSED') {
            updateData.resolvedAt = new Date();
        }

        const maintenanceRequest = await prisma.maintenanceRequest.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(maintenanceRequest);
    } catch (error) {
        console.error('Failed to update maintenance request:', error);
        return NextResponse.json(
            { error: 'Failed to update request' },
            { status: 500 }
        );
    }
}
