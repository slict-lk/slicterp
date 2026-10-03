import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { postToGL, resolveAccountCodes } from '@/lib/accounting/gl-bridge';

interface StockAdjustmentParams {
    tenantId: string;
    productId: string; // From the source module
    productName?: string; // Used to auto-sync the catalog
    productCategory?: string; // Auto-sync
    productPrice?: number; // Auto-sync
    warehouseId: string;
    quantity: number; // ALWAYS POSITIVE
    unitCost: number;
    sourceModule: string;
    sourceDocument: string;
    reference?: string;
    notes?: string;
    date?: Date;
    allowNegative?: boolean;
}

/**
 * Validates available stock before an outbound movement.
 */
export async function checkStockAvailability(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantityRequired: number
): Promise<{ available: boolean; onHand: number }> {
    const ledger = await prisma.invStockLedger.findUnique({
        where: {
            productId_warehouseId: {
                productId,
                warehouseId
            }
        }
    });

    const onHand = Number(ledger?.onHand ?? 0);
    return {
        available: onHand >= quantityRequired,
        onHand
    };
}

/**
 * Validates global available stock across all warehouses for a product.
 */
export async function checkGlobalStockAvailability(
    tenantId: string,
    productId: string,
    quantityRequired: number
): Promise<{ available: boolean; onHand: number }> {
    const product = await prisma.invProduct.findUnique({
        where: { id: productId }
    });

    const onHand = Number(product?.stockQty ?? 0);
    return {
        available: onHand >= quantityRequired,
        onHand
    };
}


/**
 * Core function to adjust stock. Used internally by recordStockIn and recordStockOut.
 */
async function processStockMovement(
    type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'WRITE_OFF' | 'TRANSFER',
    direction: 1 | -1,
    params: StockAdjustmentParams,
    txClient?: any
) {
    const { tenantId, productId, productName, productCategory, productPrice, warehouseId, quantity, unitCost, sourceModule, sourceDocument, reference, notes, date } = params;

    if (quantity <= 0) {
        throw new Error('Stock movement quantity must be positive');
    }

    const totalCost = quantity * unitCost;

    const work = async (tx: any) => {
        // 1. Double check product exists, or create it if missing (Seamless cross-module sync)
        let product = await tx.invProduct.findFirst({
            where: { id: productId, tenantId }
        });

        if (!product) {
            if (!productName) throw new Error(`Product not found in Inventory and no name provided to auto-sync: ${productId}`);

            // Lookup category by name or create a default if it doesn't exist
            let categoryId: string | null = null;
            if (productCategory) {
                const category = await tx.invCategory.findFirst({
                    where: {
                        tenantId,
                        name: { equals: productCategory, mode: 'insensitive' }
                    }
                });

                if (category) {
                    categoryId = category.id;
                } else {
                    console.warn(`[InventoryBridge] Category "${productCategory}" not found for product ${productId}. Defaulting to null.`);
                }
            }

            // Auto-sync into Inventory Master Catalog
            product = await tx.invProduct.create({
                data: {
                    id: productId, // Match the external module ID
                    tenantId,
                    sku: `${sourceModule.toUpperCase().substring(0, 3)}-${productId.substring(0, 6)}`,
                    name: productName,
                    categoryId,
                  salePrice: productPrice ?? 0,
                  costPrice: unitCost ?? 0,
                    type: 'STORABLE',
                    isActive: true,
                }
            });
        }

        // Only storable products track physical stock movement
        if (product.type !== 'STORABLE') {
            return { skipped: true, reason: 'NOT_STORABLE' };
        }

        const delta = quantity * direction;

        // 2. Insert Append-Only Audit Log
        const movement = await tx.invStockMovement.create({
            data: {
                tenantId,
                productId,
                warehouseId,
                type,
                direction,
                quantity,
                unitCost,
                totalCost,
                sourceModule,
                sourceDocument,
                reference,
                notes,
                date: date || new Date(),
                glPostingStatus: 'PENDING' // Assuming we want GL tracking for all movements
            }
        });

        // 3. Update the specific Warehouse Ledger
        const ledger = await tx.invStockLedger.upsert({
            where: {
                productId_warehouseId: { productId, warehouseId }
            },
            create: {
                tenantId,
                productId,
                warehouseId,
                onHand: delta
            },
            update: {
                onHand: { increment: delta }
            }
        });

        if (Number(ledger.onHand) < 0 && !params.allowNegative) {
            // If the source module has already permitted the transaction (e.g., POS sold it),
            // we should not completely block the sync unless strictly enforced.
            // For now, if allowNegative is false, we throw.
            throw new Error(`Insufficient stock in warehouse ${warehouseId} for product ${productId}. Current Balance: ${Number(ledger.onHand)}`);
        }

        // 4. Update the aggregate stockQty on the Product
        const aggregate = await tx.invStockLedger.aggregate({
            where: { productId },
            _sum: { onHand: true }
        });

        const newStockTotal = Number(aggregate._sum.onHand || 0);

        // Calculate new moving average cost if this is an INWARD movement
        let newCostPrice = Number(product.costPrice);
        if (direction === 1 && newStockTotal > 0) {
            const previousTotalValue = Number(product.stockQty) * Number(product.costPrice);
            const incomingValue = quantity * unitCost;
            newCostPrice = (previousTotalValue + incomingValue) / newStockTotal;
        }

        await tx.invProduct.update({
            where: { id: productId },
            data: {
                stockQty: newStockTotal,
                ...(direction === 1 ? { costPrice: newCostPrice } : {}) // Update cost on receipt
            }
        });

        return { movement, ledger };
    };
    if (txClient) return await work(txClient);
    return await prisma.$transaction(work);
}

/**
 * Records an INBOUND stock movement (purchases, positive adjustments, returns, transfers)
 */
export async function recordStockIn(type: 'IN' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER', params: StockAdjustmentParams, txClient?: any) {
    const result = await processStockMovement(type, 1, params, txClient);

    // Skip GL post for non-storable products
    if ('skipped' in result) return result;
    const movement = result.movement;
    if (!movement) return result;

    try {
        if (params.sourceModule === 'inventory' && type !== 'TRANSFER') {
            const isPO = params.sourceDocument === 'po-receive' || params.notes?.includes('PO Receipt');
            const eventType = isPO ? 'INVENTORY_RECEIPT' : 'INVENTORY_ADJUSTMENT';
            const accounts = await resolveAccountCodes(params.tenantId, 'inventory', eventType);

            if (accounts && params.unitCost > 0) {
                postToGL({
                    tenantId: params.tenantId,
                    sourceModule: 'inventory',
                    sourceDocumentId: movement.id,
                    sourceDocumentType: 'StockMovement',
                    eventType,
                    reference: params.reference || `STK-IN-${movement.id.substring(0, 6)}`,
                    description: `Stock In (${type}) - ${params.productName || params.productId}`,
                    date: params.date || new Date(),
                    lines: [
                        { accountCode: accounts.debitCode, debit: Number(movement.totalCost), credit: 0, description: 'Inventory Asset' },
                        { accountCode: accounts.creditCode, debit: 0, credit: Number(movement.totalCost), description: isPO ? 'Accounts Payable' : 'Inventory Adjustment' }
                    ]
                }).catch(e => console.error("GL Bridge Background Task Failed on StockIn:", e));
            }
        }
    } catch (error) {
        console.error("GL Bridge failed on StockIn:", error);
    }

    return result;
}

/**
 * Records an OUTBOUND stock movement (sales, negative adjustments, write-offs, consumption, transfers)
 */
export async function recordStockOut(type: 'OUT' | 'ADJUSTMENT' | 'WRITE_OFF' | 'TRANSFER', params: StockAdjustmentParams, txClient?: any) {
    const result = await processStockMovement(type, -1, params, txClient);

    // Skip GL post if not storable
    if ('skipped' in result) return result;
    const movement = result.movement;
    if (!movement) return result;

    try {
        if (params.sourceModule === 'inventory' && type !== 'TRANSFER') {
            const eventType = 'INVENTORY_ADJUSTMENT';
            const accounts = await resolveAccountCodes(params.tenantId, 'inventory', eventType);

            if (accounts && params.unitCost > 0) {
                postToGL({
                    tenantId: params.tenantId,
                    sourceModule: 'inventory',
                    sourceDocumentId: movement.id,
                    sourceDocumentType: 'StockMovement',
                    eventType,
                    reference: params.reference || `STK-OUT-${movement.id.substring(0, 6)}`,
                    description: `Stock Out (${type}) - ${params.productName || params.productId}`,
                    date: params.date || new Date(),
                    lines: [
                        { accountCode: accounts.debitCode, debit: Number(movement.totalCost), credit: 0, description: 'Inventory Adjustment' },
                        { accountCode: accounts.creditCode, debit: 0, credit: Number(movement.totalCost), description: 'Inventory Asset' }
                    ]
                }).catch(e => console.error("GL Bridge Background Task Failed on StockOut:", e));
            }
        }
    } catch (error) {
        console.error("GL Bridge failed on StockOut:", error);
    }

    return result;
}
