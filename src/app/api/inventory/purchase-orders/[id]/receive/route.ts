import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { recordStockIn, recordStockOut } from '@/lib/inventory/inventory-bridge';
import { recordInventoryOperationalEvent } from '@/lib/intelligence/events/inventory-operational-events';

export const dynamic = 'force-dynamic';

// POST /api/inventory/purchase-orders/[id]/receive
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params;
        const tenant = await getOrCreateDefaultTenant();
        const body = await request.json();
        const { destinationWarehouseId, linesToReceive } = body;
        // linesToReceive: Array<{ lineId: string, quantity: number }>

        if (!destinationWarehouseId || !linesToReceive || !Array.isArray(linesToReceive)) {
            return NextResponse.json({ error: 'Invalid payload. Requires destinationWarehouseId and linesToReceive array.' }, { status: 400 });
        }

        const order = await prisma.invPurchaseOrder.findUnique({
            where: { id: params.id, tenantId: tenant.id },
            include: { lines: true }
        });

        if (!order) {
            return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
        }

        if (order.status === 'RECEIVED' || order.status === 'CANCELLED') {
            return NextResponse.json({ error: `Cannot receive stock for order in ${order.status} status` }, { status: 400 });
        }

        // Check ALL order lines for fully-received status, not just lines in this batch
        let allFullyReceived = true;
        const successfullyReceivedLines = [];

        try {
            for (const rLine of linesToReceive) {
                const dbLine = order.lines.find(l => l.id === rLine.lineId);
                if (!dbLine) continue;

                const receiveQty = Number(rLine.quantity);
                if (receiveQty <= 0) {
                    allFullyReceived = false;
                    continue;
                }

                const cumulative = Number((dbLine as any).receivedQty || 0) + receiveQty;
                if (cumulative < Number(dbLine.quantity)) {
                    allFullyReceived = false;
                }

                const cappedCumulative = Math.min(cumulative, Number(dbLine.quantity));
                const actualReceivedThisTime = cappedCumulative - Number((dbLine as any).receivedQty || 0);

                if (actualReceivedThisTime <= 0) {
                    continue;
                }

                // Update DB Line immediately
                const prevReceivedQuantity = Number((dbLine as any).receivedQty || 0);
                await (prisma.invPurchaseOrderLine as any).update({
                    where: { id: dbLine.id },
                    data: { receivedQty: cappedCumulative }
                });

                // Call bridge
                await recordStockIn('IN', {
                    tenantId: tenant.id,
                    productId: dbLine.productId,
                    warehouseId: destinationWarehouseId,
                    quantity: actualReceivedThisTime,
                    unitCost: Number(dbLine.unitCost), // Crucial for moving average recalculation
                    sourceModule: 'inventory',
                    sourceDocument: order.id,
                    reference: order.poNumber,
                    notes: `PO Receipt`
                });

                successfullyReceivedLines.push({
                    id: dbLine.id, // Capture id
                    productId: dbLine.productId,
                    quantity: actualReceivedThisTime,
                    receivedQty: cappedCumulative,
                    prevReceivedQty: prevReceivedQuantity, // Capture old val
                    unitCost: Number(dbLine.unitCost)
                });
            }
        } catch (error) {
            console.error('Error during PO receiving, initiating compensation rollback', error);
            const failedProductIds = [];

            for (const line of successfullyReceivedLines) {
                let success = false;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        await recordStockOut('OUT', {
                            tenantId: tenant.id,
                            productId: line.productId,
                            warehouseId: destinationWarehouseId,
                            quantity: line.quantity,
                            unitCost: line.unitCost,
                            sourceModule: 'inventory',
                            sourceDocument: order.id,
                            reference: `ROLLBACK-${order.poNumber}`
                        });

                        // Revert receivedQty
                        await (prisma.invPurchaseOrderLine as any).update({
                            where: { id: line.id },
                            data: { receivedQty: line.prevReceivedQty }
                        });

                        success = true;
                        break;
                    } catch (e) {
                        console.error(`Rollback attempt ${attempt} failed for product ${line.productId}`);
                        if (attempt < 3) await new Promise(res => setTimeout(res, 500));
                    }
                }
                if (!success) {
                    failedProductIds.push(line.productId);
                }
            }
            if (failedProductIds.length > 0) {
                throw new Error(`Transaction failed and was rolled back. CRITICAL: Manual cleanup required for product IDs: ${failedProductIds.join(', ')}`);
            }
            throw new Error('Transaction failed and was rolled back');
        }

        // Re-check ALL lines to determine if fully received
        const refreshedOrder = await prisma.invPurchaseOrder.findUnique({
            where: { id: order.id },
            include: { lines: true }
        });
        allFullyReceived = refreshedOrder!.lines.every(
            (l: any) => Number(l.receivedQty || 0) >= Number(l.quantity)
        );
        const newStatus = allFullyReceived ? 'RECEIVED' : 'PARTIAL';
        const updatedOrder = await prisma.invPurchaseOrder.update({
            where: { id: order.id },
            data: {
                status: newStatus,
                receivedAt: newStatus === 'RECEIVED' ? new Date() : undefined
            }
        });

        // TODO: GL POSTING (Phase 6) 
        // Debit Inventory Asset, Credit Accounts Payable if received.

        await recordInventoryOperationalEvent({
            tenantId: tenant.id,
            entityType: 'purchase_order_receipt',
            entityId: order.id,
            action: 'purchase_order.received',
            metadata: {
                poNumber: order.poNumber,
                destinationWarehouseId,
                status: newStatus,
                receivedLineCount: successfullyReceivedLines.length,
                receivedLines: successfullyReceivedLines.map((line) => ({
                    productId: line.productId,
                    quantity: line.quantity,
                    receivedQty: line.receivedQty,
                })),
            },
        });

        return NextResponse.json(updatedOrder, { status: 200 });

    } catch (error: any) {
        console.error('Error receiving PO stock:', error);
        return NextResponse.json({ error: error.message || 'Failed to receive stock' }, { status: 500 });
    }
}
