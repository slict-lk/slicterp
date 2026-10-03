'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth'; // Assuming getCurrentUser is in lib/auth

export async function getStockMovements(limit = 20) {
    const user = await getCurrentUser();
    if (!user) return [];

    return await prisma.stockMovement.findMany({
        where: { tenantId: user.tenantId },
        take: limit,
        orderBy: { movementDate: 'desc' },
        include: {
            product: true,
            warehouse: true,
        },
    });
}

export async function getWarehouses() {
    try {
        const user = await getCurrentUser();
        if (!user) return [];

        // Ensure at least one warehouse exists (dev helper)
        const warehouse = await prisma.warehouse.findFirst({
            where: { tenantId: user.tenantId }
        });

        if (!warehouse) {
            return [await prisma.warehouse.create({
                data: {
                    tenantId: user.tenantId,
                    name: 'Main Warehouse',
                    code: 'MAIN',
                    address: '123 Main St'
                }
            })];
        }

        return await prisma.warehouse.findMany({
            where: { tenantId: user.tenantId }
        });
    } catch (error) {
        return [];
    }
}

export async function searchProducts(query: string) {
    if (!query || query.length < 2) return [];

    const user = await getCurrentUser();
    if (!user) return [];

    return await prisma.product.findMany({
        where: {
            tenantId: user.tenantId,
            OR: [
                { sku: { contains: query, mode: 'insensitive' } },
                { name: { contains: query, mode: 'insensitive' } },
            ]
        },
        take: 10,
        select: { id: true, name: true, sku: true, stockQty: true }
    });
}

export async function createStockAdjustment(data: {
    productId: string;
    warehouseId: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT'; // Simplified MovementType
    quantity: number;
    notes?: string;
}) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error("Unauthorized");

        await prisma.$transaction(async (tx) => {
            // 1. Create Movement
            await tx.stockMovement.create({
                data: {
                    tenantId: user.tenantId,
                    productId: data.productId,
                    warehouseId: data.warehouseId,
                    type: data.type === 'IN' ? 'IN' : data.type === 'OUT' ? 'OUT' : 'ADJUSTMENT',
                    quantity: data.quantity,
                    notes: data.notes,
                    movementDate: new Date(),
                    reference: 'MANUAL_ADJ',
                }
            });

            // 2. Update Product Stock
            const adjustment = data.type === 'OUT' ? -data.quantity : data.quantity;

            await tx.product.update({
                where: { id: data.productId },
                data: {
                    stockQty: { increment: adjustment }
                }
            });
        });

        revalidatePath('/automotive/adjustments');
        revalidatePath('/automotive/parts');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to adjust stock:', error);
        return { success: false, message: error.message };
    }
}
