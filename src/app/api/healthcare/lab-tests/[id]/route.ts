import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const tenant = await getOrCreateDefaultTenant();

        const test = await prisma.labTest.findFirst({
            where: { id, tenantId: tenant.id },
        });

        if (!test) {
            return NextResponse.json(
                { error: 'Lab test not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(test);
    } catch (error) {
        console.error('Error fetching lab test:', error);
        return NextResponse.json(
            { error: 'Failed to fetch lab test' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await request.json();

        const test = await prisma.labTest.update({
            where: { id },
            data: {
                name: data.name,
                code: data.code,
                category: data.category,
                price: data.price,
                description: data.description,
                resultTemplate: data.resultTemplate,
                isActive: data.isActive,
            },
        });

        return NextResponse.json(test);
    } catch (error) {
        console.error('Error updating lab test:', error);
        return NextResponse.json(
            { error: 'Failed to update lab test' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Check if test is used in any lab orders
        const ordersCount = await prisma.labOrder.count({
            where: { labTestId: id },
        });

        if (ordersCount > 0) {
            // Soft delete - just mark as inactive
            await prisma.labTest.update({
                where: { id },
                data: { isActive: false },
            });
            return NextResponse.json({ success: true, deactivated: true });
        }

        // Hard delete if not used
        await prisma.labTest.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting lab test:', error);
        return NextResponse.json(
            { error: 'Failed to delete lab test' },
            { status: 500 }
        );
    }
}
