import prisma from "@/lib/prisma";

export interface FulfillmentRequestResult {
    success: boolean;
    requestId: string | null;
    error?: string;
}

/**
 * Service to manage handing off Sales Orders to Inventory/Logistics.
 */
export class FulfillmentService {
    /**
     * Generates a fulfillment request for a confirmed and approved sales order.
     */
    static async requestFulfillment(
        tenantId: string,
        orderId: string,
        userId: string
    ): Promise<FulfillmentRequestResult> {
        const order = await prisma.salesOrderV2.findUnique({
            where: { id: orderId, tenantId },
            include: { lines: true },
        });

        if (!order) {
            return { success: false, requestId: null, error: "Order not found" };
        }

        if (order.approvalStatus !== "APPROVED" && order.approvalStatus !== "NOT_REQUIRED") {
            return { success: false, requestId: null, error: "Order must be approved before fulfillment" };
        }

        if (order.status === "DRAFT" || order.status === "CANCELLED") {
            return { success: false, requestId: null, error: `Cannot fulfill order in ${order.status} state` };
        }

        // Wrap in a transaction to create the request and update the order
        try {
            const result = await prisma.$transaction(async (tx) => {
                // Create the fulfillment request (Handoff to inventory)
                const request = await tx.salesFulfillmentRequest.create({
                    data: {
                        tenantId,
                        salesOrderId: orderId,
                        status: "REQUESTED",
                        requestNumber: `FR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        metadata: {
                            requestedBy: userId,
                            lineItemCount: order.lines.length,
                        },
                    },
                });

                // Update the order status
                await tx.salesOrderV2.update({
                    where: { id: orderId },
                    data: {
                        fulfillmentStatus: "REQUESTED",
                        status: order.status === "CONFIRMED" ? "IN_PROGRESS" : order.status,
                        updatedAt: new Date(),
                    },
                });

                return request;
            });

            return { success: true, requestId: result.id };
        } catch (e: any) {
            return { success: false, requestId: null, error: e.message || "Database transaction failed" };
        }
    }

    static async recordShipment(
        tenantId: string,
        requestId: string,
        shippedLines: Array<{ lineId: string; quantity: number }>,
        options?: { createBackorder?: boolean; expectedOrderId?: string }
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const request = await prisma.salesFulfillmentRequest.findUnique({
                where: { id: requestId, tenantId },
            });

            if (!request) {
                return { success: false, error: "Fulfillment request not found." };
            }

            // Security check: ensure the request belongs to the order from the route
            if (options?.expectedOrderId && request.salesOrderId !== options.expectedOrderId) {
                return { success: false, error: "Fulfillment request does not belong to the specified order." };
            }

            if (request.status === "SHIPPED" || request.status === "COMPLETED") {
                return { success: false, error: "Request is already shipped or completed." };
            }

            const order = await prisma.salesOrderV2.findUnique({
                where: { id: request.salesOrderId },
                include: { lines: true }
            });

            if (!order) {
                return { success: false, error: "Associated Sales Order not found." };
            }

            // Validate that all shipped line IDs actually belong to this order
            const orderLineIds = new Set(order.lines.map(l => l.id));
            for (const item of shippedLines) {
                if (!orderLineIds.has(item.lineId)) {
                    return { success: false, error: `Line item ${item.lineId} does not belong to this order.` };
                }
            }

            await prisma.$transaction(async (tx) => {
                // 1. Update the fulfillment request
                await tx.salesFulfillmentRequest.update({
                    where: { id: requestId },
                    data: {
                        status: "SHIPPED",
                        updatedAt: new Date(),
                    },
                });

                // 2. Process shipped lines and update order line fulfilled quantities
                let allFullyShipped = true;
                const backorderItems: Array<{ lineId: string; remainingQuantity: number }> = [];

                for (const orderLine of order.lines) {
                    const shippedParam = shippedLines.find(sl => sl.lineId === orderLine.id);
                    const newlyShipped = shippedParam ? shippedParam.quantity : 0;
                    const newTotalFulfilled = orderLine.quantityFulfilled + newlyShipped;

                    // Guard against over-shipping
                    if (newTotalFulfilled > orderLine.quantityOrdered) {
                        throw new Error(`Cannot ship ${newlyShipped} for line ${orderLine.id}. Total would exceed ordered quantity (${orderLine.quantityOrdered}).`);
                    }

                    if (newlyShipped > 0) {
                        await tx.salesOrderLine.update({
                            where: { id: orderLine.id },
                            data: { quantityFulfilled: newTotalFulfilled }
                        });
                    }

                    const remaining = orderLine.quantityOrdered - newTotalFulfilled;
                    if (remaining > 0) {
                        allFullyShipped = false;
                        backorderItems.push({ lineId: orderLine.id, remainingQuantity: remaining });
                    }
                }

                const newOrderStatus = allFullyShipped ? "DELIVERED" : "PARTIALLY_FULFILLED";

                // 3. Update the parent Order
                await tx.salesOrderV2.update({
                    where: { id: request.salesOrderId },
                    data: {
                        status: newOrderStatus,
                        fulfillmentStatus: allFullyShipped ? "SHIPPED" : "PARTIALLY_FULFILLED",
                        updatedAt: new Date(),
                    },
                });

                // 4. Explicit Backorder Logic
                if (!allFullyShipped && options?.createBackorder) {
                    await tx.salesFulfillmentRequest.create({
                        data: {
                            tenantId,
                            salesOrderId: order.id,
                            status: "BACKORDER",
                            requestNumber: `BO-${request.requestNumber || Date.now()}`,
                            metadata: {
                                sourceRequestId: request.id,
                                items: backorderItems,
                            },
                        },
                    });
                }
            });

            return { success: true };
        } catch (e: any) {
            console.error("Failed to record shipment:", e);
            return { success: false, error: "Database transaction failed." };
        }
    }
}
