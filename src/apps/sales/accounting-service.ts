import prisma from "@/lib/prisma";

export interface InvoiceDraftResult {
    success: boolean;
    invoiceId: string | null;
    error?: string;
}

/**
 * Service to manage handing off fulfilled Sales Orders to the Accounting module.
 */
export class AccountingService {
    /**
     * Generates a draft invoice from a fulfilled Sales Order.
     */
    static async draftInvoiceForOrder(
        tenantId: string,
        orderId: string,
        userId: string
    ): Promise<InvoiceDraftResult> {
        const order = await prisma.salesOrderV2.findUnique({
            where: { id: orderId, tenantId },
            include: { lines: true },
        });

        if (!order) {
            return { success: false, invoiceId: null, error: "Order not found" };
        }

        if (!order.customerAccountId) {
            return { success: false, invoiceId: null, error: "Order missing customer account ID" };
        }

        if (order.status !== "IN_PROGRESS" && order.status !== "CONFIRMED" && order.status !== "DELIVERED" && order.status !== "PARTIALLY_FULFILLED") {
            return { success: false, invoiceId: null, error: "Order must be confirmed, in progress, or delivered to invoice" };
        }

        if (order.invoiceStatus === "INVOICED") {
            return { success: false, invoiceId: null, error: "Order has already been fully invoiced" };
        }

        try {
            const result = await prisma.$transaction(async (tx) => {
                // Idempotency: Return existing unattended draft if present
                const existingDraft = await tx.invoice.findFirst({
                    where: { salesOrderId: orderId, status: "DRAFT", tenantId }
                });

                if (existingDraft) {
                    return existingDraft;
                }

                const existingInvoices = await tx.invoice.findMany({
                    where: { salesOrderId: orderId, status: { not: "CANCELLED" }, tenantId },
                });

                const totalInvoicedAmount = existingInvoices.reduce((sum, inv) => sum + inv.total, 0);
                const remainingAmount = Math.max(0, (order.grandTotal || 0) - totalInvoicedAmount);

                if (remainingAmount <= 0 && existingInvoices.length > 0) {
                    await tx.salesOrderV2.update({
                        where: { id: orderId },
                        data: { invoiceStatus: "INVOICED" }
                    });
                    throw new Error("Order is already fully invoiced");
                }

                const linesToInvoice = order.lines.flatMap((line) => {
                    const invoicedQty = line.quantityInvoiced || 0;
                    const remainingQty = Math.max(0, line.quantityOrdered - invoicedQty);
                    if (remainingQty <= 0) return [];

                    const lineRatio = remainingQty / line.quantityOrdered;
                    return [{
                        tenantId,
                        description: line.description || "Item",
                        quantity: remainingQty,
                        unitPrice: line.unitPrice,
                        tax: (line.taxAmount || 0) * lineRatio,
                        discount: (line.discountAmount || 0) * lineRatio,
                        total: ((line.quantityOrdered * line.unitPrice) + (line.taxAmount || 0) - (line.discountAmount || 0)) * lineRatio,
                        lineTotal: (line.lineTotal || 0) * lineRatio,
                        originalLineId: line.id,
                        remainingQty,
                        invoicedQty
                    }];
                });

                if (linesToInvoice.length === 0) {
                    await tx.salesOrderV2.update({
                        where: { id: orderId },
                        data: { invoiceStatus: "INVOICED" }
                    });
                    throw new Error("No uninvoiced lines remain on this order");
                }

                const invoice = await tx.invoice.create({
                    data: {
                        tenantId,
                        number: `INV-${Date.now()}-${Math.floor(Math.random() * 100)}`,
                        customerId: order.customerAccountId as string,
                        salesOrderId: order.id,
                        status: "DRAFT",
                        issueDate: new Date(),
                        dueDate: new Date(Date.now() + 30 * 86400000), // Net 30 terms
                        subtotal: Math.max(0, (order.subtotal || 0) - existingInvoices.reduce((sum, inv) => sum + inv.subtotal, 0)),
                        tax: Math.max(0, (order.taxTotal || 0) - existingInvoices.reduce((sum, inv) => sum + inv.tax, 0)),
                        discount: Math.max(0, (order.discountTotal || 0) - existingInvoices.reduce((sum, inv) => sum + inv.discount, 0)),
                        total: remainingAmount,
                        amountDue: remainingAmount,
                        amountPaid: 0,
                        notes: `Draft invoice generated from order ${order.orderNumber}.`,
                        lines: {
                            create: linesToInvoice.map(({ originalLineId, remainingQty, invoicedQty, ...dto }) => dto)
                        },
                    },
                });

                let allFullyInvoiced = true;

                for (const mappedLine of linesToInvoice) {
                    if (!mappedLine) continue;
                    const newTotal = mappedLine.invoicedQty + mappedLine.remainingQty;
                    const originalLine = order.lines.find(l => l.id === mappedLine.originalLineId);

                    await tx.salesOrderLine.update({
                        where: { id: mappedLine.originalLineId },
                        data: { quantityInvoiced: newTotal }
                    });

                    if (originalLine && newTotal < originalLine.quantityOrdered) {
                        allFullyInvoiced = false;
                    }
                }

                // Check lines that were not in linesToInvoice
                for (const line of order.lines) {
                    if ((line.quantityInvoiced || 0) < line.quantityOrdered && !linesToInvoice.find(l => l?.originalLineId === line.id)) {
                        allFullyInvoiced = false;
                    }
                }

                // Track invoice back on the order
                await tx.salesOrderV2.update({
                    where: { id: orderId },
                    data: {
                        invoiceStatus: allFullyInvoiced ? "INVOICED" : "PARTIALLY_INVOICED",
                        updatedAt: new Date(),
                    },
                });

                return invoice;
            });

            return { success: true, invoiceId: result.id };
        } catch (e: any) {
            return { success: false, invoiceId: null, error: e.message || "Invoice draft generation failed" };
        }
    }
}
