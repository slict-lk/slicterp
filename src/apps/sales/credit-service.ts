import prisma from "@/lib/prisma";

export interface CreditEvaluationResult {
    isApproved: boolean;
    reasons: string[];
    currentExposure: number;
    creditLimit: number;
}

/**
 * Service to manage and evaluate customer credit exposure.
 */
export class CreditService {
    /**
     * Evaluates if a new order breaches the customer's credit limits.
     */
    static async evaluateOrderCredit(
        tenantId: string,
        customerAccountId: string,
        orderAmount: number
    ): Promise<CreditEvaluationResult> {
        const account = await prisma.customerAccount.findUnique({
            where: { id: customerAccountId },
        });

        if (!account) {
            throw new Error("Customer account not found");
        }

        if (!account.creditLimit || account.creditLimit <= 0) {
            // If no limit is set, assume strict prepay / zero credit scenario
            return {
                isApproved: false,
                reasons: ["No credit limit established for this account"],
                currentExposure: 0,
                creditLimit: 0,
            };
        }

        // Calculate Uninvoiced Sales Orders Exposure
        const uninvoicedOrders = await prisma.salesOrderV2.aggregate({
            _sum: { grandTotal: true },
            where: {
                tenantId,
                customerAccountId,
                status: { notIn: ["CANCELLED", "DRAFT"] },
                invoiceStatus: { notIn: ["INVOICED"] },
            }
        });

        // Calculate Unpaid Invoices Exposure
        const unpaidInvoices = await prisma.invoice.aggregate({
            _sum: { amountDue: true },
            where: {
                tenantId,
                customerId: customerAccountId,
                status: { notIn: ["PAID", "CANCELLED"] },
            }
        });

        const activeOrderExposure = uninvoicedOrders._sum?.grandTotal || 0;
        const invoiceExposure = unpaidInvoices._sum?.amountDue || 0;
        const currentExposure = activeOrderExposure + invoiceExposure;
        const projectedExposure = currentExposure + orderAmount;

        let isApproved = projectedExposure <= account.creditLimit;
        const reasons: string[] = [];

        // Check for overdue unpaid invoices
        const overdueInvoicesCount = await prisma.invoice.count({
            where: {
                tenantId,
                customerId: customerAccountId,
                status: { notIn: ["PAID", "CANCELLED"] },
                dueDate: { lt: new Date() },
            }
        });

        if (overdueInvoicesCount > 0) {
            isApproved = false;
            reasons.push(`Account has ${overdueInvoicesCount} overdue unpaid invoice(s)`);
        }

        if (projectedExposure > account.creditLimit) {
            reasons.push(
                `Order amount (${orderAmount}) pushes exposure (${projectedExposure}) over the limit (${account.creditLimit})`
            );
        }

        // Check for explicit holds
        if (account.creditHold) {
            reasons.push("Account is currently under explicit credit hold");
        }

        return {
            isApproved: isApproved && !account.creditHold,
            reasons,
            currentExposure,
            creditLimit: account.creditLimit,
        };
    }

    /**
     * Applies an explicit credit hold to the account.
     */
    static async placeCreditHold(
        tenantId: string,
        customerAccountId: string,
        reason: string
    ) {
        return prisma.customerAccount.update({
            where: { id: customerAccountId },
            data: {
                creditHold: true,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Releases an explicit credit hold from the account.
     */
    static async releaseCreditHold(
        tenantId: string,
        customerAccountId: string
    ) {
        return prisma.customerAccount.update({
            where: { id: customerAccountId },
            data: {
                creditHold: false,
                updatedAt: new Date(),
            },
        });
    }
}
