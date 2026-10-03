import { NextRequest, NextResponse } from 'next/server';
import { updateLabOrderResults } from '@/apps/healthcare/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { id } = await params;

        const labOrder = await prisma.labOrder.findFirst({
            where: { id, tenantId },
            include: {
                labTest: true,
                visit: {
                    include: {
                        patient: true,
                    },
                },
            },
        });

        if (!labOrder) {
            return NextResponse.json(
                { error: 'Lab order not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(labOrder);
    } catch (error) {
        console.error('Error fetching lab order:', error);
        return NextResponse.json(
            { error: 'Failed to fetch lab order' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const { id } = await params;
        const data = await request.json();

        // Update lab order status or results
        const updateData: Record<string, unknown> = {};

        if (data.status) updateData.status = data.status;
        if (data.isPaid !== undefined) updateData.isPaid = data.isPaid;
        if (data.results) {
            updateData.results = data.results;
            updateData.resultDate = new Date();
            updateData.resultEnteredBy = data.resultEnteredBy || 'lab-user';
            updateData.resultNotes = data.resultNotes || null;
            updateData.status = 'COMPLETED';
        }

        const labOrder = await prisma.labOrder.update({
            where: { id },
            data: updateData,
            include: {
                labTest: true,
            },
        });

        return NextResponse.json(labOrder);
    } catch (error) {
        console.error('Error updating lab order:', error);
        return NextResponse.json(
            { error: 'Failed to update lab order' },
            { status: 500 }
        );
    }
}
