import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/spareparts/customers/[id]/settle - Settle Debt (Record Payment)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { amount, description, referenceId } = body;

        const paymentAmount = parseFloat(amount);

        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Use transaction to ensure data integrity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get current customer to check balance
            const customer = await (tx as any).shopCustomer.findFirst({
                where: { id: id, tenantId: user.tenantId },
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            // 2. Reduce Credit Balance (Credit Transaction)
            const newBalance = Number(customer.creditBalance) - paymentAmount;

            // 3. Create Credit Transaction Record
            await (tx as any).customerCreditTransaction.create({
                data: {
                    customerId: id,
                    tenantId: user.tenantId,
                    amount: paymentAmount,
                    type: 'CREDIT', // Payment/Credit
                    description: description || 'Debt Settlement / Payment',
                    referenceId: referenceId,
                    balanceAfter: newBalance,
                },
            });

            // 4. Update Customer Balance
            const updatedCustomer = await (tx as any).shopCustomer.update({
                where: { id: id },
                data: {
                    creditBalance: newBalance,
                },
            });

            return updatedCustomer;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error settling debt:', error);
        return NextResponse.json({ error: error.message || 'Failed to settle debt' }, { status: 500 });
    }
}
