
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/vehicle-export/wallet/deposit
// User submits a deposit request with payment proof
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { amount, currency, reference, proofUrl } = body;

        if (!amount || !proofUrl) {
            return NextResponse.json({ error: 'Amount and Payment Proof are required' }, { status: 400 });
        }

        // 1. Get or Create Wallet
        // We use a transaction to ensure wallet exists before attaching transaction
        const result = await prisma.$transaction(async (tx) => {
            let wallet = await tx.exportWallet.findUnique({
                where: { customerId: user.id },
            });

            if (!wallet) {
                wallet = await tx.exportWallet.create({
                    data: {
                        customerId: user.id,
                        tenantId: user.tenantId,
                        balance: 0,
                        currency: currency || 'USD',
                    },
                });
            }

            // 2. Create Transaction (PENDING)
            const transaction = await tx.exportWalletTransaction.create({
                data: {
                    walletId: wallet.id,
                    tenantId: user.tenantId,
                    amount: parseFloat(amount),
                    type: 'DEPOSIT',
                    reference: reference || 'Bank Transfer',
                    proofUrl,
                    status: 'PENDING',
                    description: `Deposit Request - ${reference || 'Manual Transfer'}`,
                },
            });

            return transaction;
        });

        return NextResponse.json({ transaction: result });

    } catch (error) {
        console.error('Error creating deposit request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
