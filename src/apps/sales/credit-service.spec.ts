import { CreditService } from "./credit-service";
import prisma from "@/lib/prisma";

// Mock the prisma client
jest.mock("@/lib/prisma", () => ({
    __esModule: true,
    default: {
        customerAccount: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        salesOrderV2: {
            aggregate: jest.fn(),
        },
        invoice: {
            aggregate: jest.fn(),
            count: jest.fn(),
        },
    },
}));

describe("CreditService", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("evaluateOrderCredit", () => {
        beforeEach(() => {
            // Default mocks: Zero exposure, no overdue
            (prisma.salesOrderV2.aggregate as jest.Mock).mockResolvedValue({ _sum: { grandTotal: 0 } });
            (prisma.invoice.aggregate as jest.Mock).mockResolvedValue({ _sum: { amountDue: 0 } });
            (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
        });

        it("should approve order if exposure remains under limit", async () => {
            (prisma.customerAccount.findUnique as jest.Mock).mockResolvedValue({
                id: "cust-1",
                creditLimit: 10000,
                creditHold: false,
            });

            // Mock $5000 existing exposure ($3000 orders + $2000 invoices)
            (prisma.salesOrderV2.aggregate as jest.Mock).mockResolvedValue({ _sum: { grandTotal: 3000 } });
            (prisma.invoice.aggregate as jest.Mock).mockResolvedValue({ _sum: { amountDue: 2000 } });

            const result = await CreditService.evaluateOrderCredit("tenant-1", "cust-1", 2000);

            expect(result.isApproved).toBe(true);
            expect(result.currentExposure).toBe(5000);
            expect(result.creditLimit).toBe(10000);
            expect(result.reasons).toHaveLength(0);
        });

        it("should reject order if exposure breaches limit", async () => {
            (prisma.customerAccount.findUnique as jest.Mock).mockResolvedValue({
                id: "cust-2",
                creditLimit: 10000,
                creditHold: false,
            });

            (prisma.salesOrderV2.aggregate as jest.Mock).mockResolvedValue({ _sum: { grandTotal: 9000 } });

            const result = await CreditService.evaluateOrderCredit("tenant-1", "cust-2", 2000);

            expect(result.isApproved).toBe(false);
            expect(result.reasons[0]).toContain("pushes exposure");
        });

        it("should reject order if explicit credit hold is active regardless of limit", async () => {
            (prisma.customerAccount.findUnique as jest.Mock).mockResolvedValue({
                id: "cust-3",
                creditLimit: 10000,
                creditHold: true,
            });

            const result = await CreditService.evaluateOrderCredit("tenant-1", "cust-3", 500);

            expect(result.isApproved).toBe(false);
            expect(result.reasons).toContain("Account is currently under explicit credit hold");
        });

        it("should reject order if overdue invoices are detected", async () => {
            (prisma.customerAccount.findUnique as jest.Mock).mockResolvedValue({
                id: "cust-4",
                creditLimit: 10000,
                creditHold: false,
            });

            (prisma.invoice.count as jest.Mock).mockResolvedValue(2);

            const result = await CreditService.evaluateOrderCredit("tenant-1", "cust-4", 100);

            expect(result.isApproved).toBe(false);
            expect(result.reasons[0]).toContain("Account has 2 overdue unpaid invoice(s)");
        });

        it("should reject order if no limit is set (prepay mode)", async () => {
            (prisma.customerAccount.findUnique as jest.Mock).mockResolvedValue({
                id: "cust-5",
                creditLimit: null,
                creditHold: false,
            });

            const result = await CreditService.evaluateOrderCredit("tenant-1", "cust-5", 1000);

            expect(result.isApproved).toBe(false);
            expect(result.reasons).toContain("No credit limit established for this account");
        });
    });

    describe("placeCreditHold", () => {
        it("should update account to active hold status", async () => {
            await CreditService.placeCreditHold("tenant-1", "cust-1", "Past due");

            expect(prisma.customerAccount.update).toHaveBeenCalledWith({
                where: { id: "cust-1" },
                data: {
                    creditHold: true,
                    updatedAt: expect.any(Date),
                },
            });
        });
    });

    describe("releaseCreditHold", () => {
        it("should remove active hold from account", async () => {
            await CreditService.releaseCreditHold("tenant-1", "cust-1");

            expect(prisma.customerAccount.update).toHaveBeenCalledWith({
                where: { id: "cust-1" },
                data: {
                    creditHold: false,
                    updatedAt: expect.any(Date),
                },
            });
        });
    });
});
