import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { recordStockIn, recordStockOut } from '@/lib/inventory/inventory-bridge';
import { recordInventoryOperationalEvent } from '@/lib/intelligence/events/inventory-operational-events';

export const dynamic = 'force-dynamic';

// POST /api/inventory/stock/adjust
export async function POST(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const body = await request.json();

        const { productId, warehouseId, quantity, type, notes } = body;

        // Type must be 'ADJUSTMENT_ADD' or 'ADJUSTMENT_SUBTRACT' for clarity in UI, mapped to bridge constants
        const numQuantity = Number(quantity);
        if (!productId || !warehouseId || !Number.isFinite(numQuantity) || numQuantity <= 0) {
            return NextResponse.json({ error: 'Invalid parameters. productId, warehouseId required. Quantity must be a positive finite number.' }, { status: 400 });
        }

        const params = {
            tenantId: tenant.id,
            productId,
            warehouseId,
            quantity: numQuantity,
            unitCost: 0, // Adjustments usually rely on average cost, or explicit cost can be passed
            sourceModule: 'inventory',
            sourceDocument: 'manual-adjustment',
            reference: `ADJ-${Date.now()}`,
            notes: notes || 'Manual stock adjustment',
        };

        let result;
        if (type === 'ADJUSTMENT_ADD') {
            result = await recordStockIn('ADJUSTMENT', params);
        } else if (type === 'ADJUSTMENT_SUBTRACT') {
            result = await recordStockOut('ADJUSTMENT', params);
        } else {
            return NextResponse.json({ error: 'Invalid adjustment type' }, { status: 400 });
        }

        await recordInventoryOperationalEvent({
            tenantId: tenant.id,
            entityType: 'stock_adjustment',
            entityId: result.movement?.id ?? params.reference,
            action: 'stock.adjusted',
            metadata: {
                productId,
                warehouseId,
                adjustmentType: type,
                quantity: numQuantity,
                reference: params.reference,
                notes: params.notes,
            },
        });

        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        console.error('Error adjusting stock:', error);
        return NextResponse.json({ error: error.message || 'Failed to adjust stock' }, { status: 500 });
    }
}
