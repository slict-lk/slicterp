import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const tenant = await getOrCreateDefaultTenant();

        const warehouse = await prisma.invWarehouse.findUnique({
            where: {
                id: params.id,
                tenantId: tenant.id
            },
            include: {
                stockLedgers: {
                    include: {
                        product: true
                    }
                },
                stockMovements: {
                    orderBy: { date: 'desc' },
                    take: 10,
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!warehouse) {
            return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
        }

        return NextResponse.json(warehouse);
    } catch (error) {
        console.error('Error fetching warehouse details:', error);
        return NextResponse.json({ error: 'Failed to fetch warehouse details' }, { status: 500 });
    }
}

import { Prisma } from '@prisma/client';

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const tenant = await getOrCreateDefaultTenant();
        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }

        const updateData: any = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.code !== undefined) updateData.code = body.code;
        if (body.address !== undefined) updateData.address = body.address;
        if (body.description !== undefined) updateData.description = body.description;

        if (typeof body.isActive !== 'undefined') {
            updateData.isActive = Boolean(body.isActive);
        }

        const warehouse = await prisma.invWarehouse.update({
            where: {
                id: params.id,
                tenantId: tenant.id
            },
            data: updateData
        });

        return NextResponse.json(warehouse);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
        }
        console.error('Error updating warehouse:', error);
        return NextResponse.json({ error: 'Failed to update warehouse' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const tenant = await getOrCreateDefaultTenant();

        await prisma.$transaction(async (tx) => {
            // Re-check stock inside transaction to avoid race conditions (TOCTOU)
            const ledgersCount = await tx.invStockLedger.count({
                where: {
                    warehouseId: params.id,
                    tenantId: tenant.id,
                    onHand: { gt: 0 }
                }
            });

            if (ledgersCount > 0) {
                const error = new Error('Cannot delete warehouse with active stock');
                (error as any).code = 'ACTIVE_STOCK';
                throw error;
            }

            await tx.invWarehouse.delete({
                where: {
                    id: params.id,
                    tenantId: tenant.id
                }
            });
        });

        return new NextResponse(null, { status: 204 });
    } catch (error: any) {
        if (error.code === 'ACTIVE_STOCK') {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
        }
        console.error('Error deleting warehouse:', error);
        return NextResponse.json({ error: 'Failed to delete warehouse' }, { status: 500 });
    }
}
