
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/vehicle-export/wallet/transactions
// List transactions (optionally filtered by customer/tenant)
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customerId');
        const status = searchParams.get('status');

        const where: any = {
            tenantId: user.tenantId,
        };

        if (customerId) {
            // Find wallet by customerId first
            const wallet = await prisma.exportWallet.findUnique({
                where: { customerId },
            });
            if (wallet) {
                where.walletId = wallet.id;
            } else {
                return NextResponse.json({ transactions: [] });
            }
        }

        if (status) where.status = status;

        const transactions = await prisma.exportWalletTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                wallet: {
                    include: { customer: true }
                }
            }
        });

        return NextResponse.json({ transactions });
    } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/vehicle-export/wallet/transactions
// Create a new transaction (Deposit, Refund, etc.)
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { customerId, amount, type, reference, description } = body; // status defaults to CLEARED for admin, or PENDING if user? 
        // Assuming this is ADMIN/FINANCE action, so we can set CLEARED by default or passed explicitly.

        if (!customerId || !amount || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get or Create Wallet
        let wallet = await prisma.exportWallet.findUnique({
            where: { customerId },
        });

        if (!wallet) {
            wallet = await prisma.exportWallet.create({
                data: {
                    customerId,
                    tenantId: user.tenantId,
                    balance: 0,
                },
            });
        }

        // 2. Create Transaction
        // Use transaction to ensure balance update sync
        const result = await prisma.$transaction(async (tx) => {
            const transaction = await tx.exportWalletTransaction.create({
                data: {
                    walletId: wallet!.id,
                    tenantId: user.tenantId,
                    amount: parseFloat(amount),
                    type,
                    reference,
                    description,
                    status: body.status || 'CLEARED',
                },
            });

            // 3. Update Balance if CLEARED
            if (transaction.status === 'CLEARED') {
                const newBalance = type === 'DEPOSIT' || type === 'REFUND' // Refund adds back to wallet? Or Refund IS a withdrawal? 
                // Usually: DEPOSIT (+) , WITHDRAWAL/PAYMENT (-) , REFUND (+).
                // Let's assume input amount is positive, and type determines sign.
                // Or clearer: DEPOSIT adds. PAYMENT subtracts.
                // Let's implement logic: 
                // DEPOSIT: +
                // REFUND: + (money back to wallet)
                // INVOICE_PAYMENT: -
                // BID_LOCK: - (temporary hold)

                // Actually, safer to just trust the sign of amount? 
                // But usually UI sends positive numbers.

                let balanceChange = parseFloat(amount);
                if (type === 'INVOICE_PAYMENT' || type === 'BID_LOCK' || type === 'WITHDRAWAL') {
                    balanceChange = -Math.abs(balanceChange);
                } else {
                    balanceChange = Math.abs(balanceChange);
                }

                await tx.exportWallet.update({
                    where: { id: wallet!.id },
                    data: {
                        balance: { increment: balanceChange },
                    },
                });
            }

            return transaction;
        });

        return NextResponse.json({ transaction: result });

    } catch (error) {
        console.error('Error creating wallet transaction:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
