import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { recordStockIn, recordStockOut } from '@/lib/inventory/inventory-bridge';
import { recordInventoryOperationalEvent } from '@/lib/intelligence/events/inventory-operational-events';

export const dynamic = 'force-dynamic';

// POST /api/inventory/stock/transfer
export async function POST(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const body = await request.json();

        const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = body;

        const numQuantity = Number(quantity);
        if (!productId || !fromWarehouseId || !toWarehouseId || !Number.isFinite(numQuantity) || numQuantity <= 0) {
            return NextResponse.json({ error: 'Invalid parameters: requires productId, fromWarehouseId, toWarehouseId, and positive quantity.' }, { status: 400 });
        }

        if (fromWarehouseId === toWarehouseId) {
            return NextResponse.json({ error: 'Cannot transfer to the same warehouse' }, { status: 400 });
        }

        const reference = `TRF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // Transfer means an OUT from source and an IN to destination
        // Wait for the OUT first so it throws if there's insufficient stock
        let outResult;
        try {
            outResult = await recordStockOut('TRANSFER', {
                tenantId: tenant.id,
                productId,
                warehouseId: fromWarehouseId,
                quantity: numQuantity,
                unitCost: 0, // Transfers do not change valuation overall, though they shift ledgers
                sourceModule: 'inventory',
                sourceDocument: 'transfer',
                reference,
                notes: `Transfer to warehouse ${toWarehouseId}. ${notes || ''}`
            });
        } catch (error: any) {
            return NextResponse.json({ error: error.message || 'Failed to extract stock from source' }, { status: 400 });
        }

        try {
            const inResult = await recordStockIn('TRANSFER', {
                tenantId: tenant.id,
                productId,
                warehouseId: toWarehouseId,
                quantity: numQuantity,
                unitCost: 0, // Preserves the moving average
                sourceModule: 'inventory',
                sourceDocument: 'transfer',
                reference,
                notes: `Transfer from warehouse ${fromWarehouseId}. ${notes || ''}`
            });
            await recordInventoryOperationalEvent({
                tenantId: tenant.id,
                entityType: 'stock_transfer',
                entityId: reference,
                action: 'stock.transferred',
                metadata: {
                    productId,
                    fromWarehouseId,
                    toWarehouseId,
                    quantity: numQuantity,
                    reference,
                    outboundMovementId: outResult.movement?.id ?? null,
                    inboundMovementId: inResult.movement?.id ?? null,
                },
            });
            return NextResponse.json({ success: true, from: outResult, to: inResult }, { status: 200 });
        } catch (error: any) {
            console.error('Inbound transfer failed, rolling back outbound transfer', error);
            try {
                await recordStockIn('TRANSFER', {
                    tenantId: tenant.id,
                    productId,
                    warehouseId: fromWarehouseId,
                    quantity: numQuantity,
                    unitCost: 0,
                    sourceModule: 'inventory',
                    sourceDocument: 'transfer-rollback',
                    reference: `${reference}-R`,
                    notes: 'Rollback of failed transfer'
                });
                await recordInventoryOperationalEvent({
                    tenantId: tenant.id,
                    entityType: 'stock_transfer',
                    entityId: reference,
                    action: 'stock.transfer_rolled_back',
                    metadata: {
                        productId,
                        fromWarehouseId,
                        toWarehouseId,
                        quantity: numQuantity,
                        reference,
                        reason: error.message || 'Inbound transfer failed',
                    },
                });
            } catch (rollbackError: any) {
                console.error(`FATAL ROLLBACK FAILURE tenant:${tenant.id} prod:${productId} qty:${quantity} ref:${reference}`, rollbackError);
                return NextResponse.json({ error: 'Transfer failed at destination and rollback source failed. Manual reconciliation required.' }, { status: 500 });
            }
            return NextResponse.json({ error: 'Transfer failed at destination, rolled back source.' }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Error transferring stock:', error);
        return NextResponse.json({ error: error.message || 'Failed to transfer stock' }, { status: 500 });
    }
}
