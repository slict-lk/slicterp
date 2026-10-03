import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { postToGL, resolveAccountCodes } from '@/lib/accounting/gl-bridge';

// PUT /api/vehicle-export/wallet/transactions/[id] - Verify/Update transaction status
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Security: Only Admins can approve/reject transactions
        if (session.user.role !== 'ADMIN' && !session.user.isSuperAdmin) {
            return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status, adminNote } = body;

        if (!status || !['PENDING', 'CLEARED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        // First get the transaction to access wallet info
        const existingTx = await (prisma as any).exportWalletTransaction.findFirst({
            where: { id, tenantId: session.user.tenantId },
            include: { wallet: true },
        });

        if (!existingTx) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        // Use transaction to update both transaction status and wallet balance atomically
        const result = await prisma.$transaction(async (tx: any) => {
            // Re-fetch inside transaction to avoid TOCTOU and enforce tenant scaling
            const currentTx = await tx.exportWalletTransaction.findFirst({
                where: { id, tenantId: session.user.tenantId }
            });

            if (!currentTx || currentTx.status !== 'PENDING') {
                throw new Error('Transaction is no longer pending');
            }

            // Update transaction status
            const updatedTx = await tx.exportWalletTransaction.update({
                where: { id },
                data: {
                    status,
                    adminNote,
                    glPostingStatus: (status === 'CLEARED' && currentTx.type === 'DEPOSIT') ? 'PENDING' : undefined
                },
            });

            // If clearing a deposit, update wallet balance
            if (status === 'CLEARED' && currentTx.type === 'DEPOSIT') {
                await tx.exportWallet.update({
                    where: { id: currentTx.walletId },
                    data: {
                        balance: {
                            increment: currentTx.amount,
                        },
                    },
                });
            }

            return updatedTx;
        });

        // --- GL POSTING ---
        try {
            if (status === 'CLEARED' && existingTx.status === 'PENDING' && existingTx.type === 'DEPOSIT') {
                const accounts = await resolveAccountCodes(session.user.tenantId, 'vehicle-export', 'CUSTOMER_DEPOSIT');
                if (accounts) {
                    await postToGL({
                        tenantId: session.user.tenantId,
                        sourceModule: 'vehicle-export',
                        sourceDocumentId: existingTx.id,
                        sourceDocumentType: 'ExportWalletTransaction',
                        eventType: 'CUSTOMER_DEPOSIT',
                        reference: `VE-DEP-${existingTx.id.slice(-6)}`,
                        description: `Customer Deposit Cleared - Ref: ${existingTx.reference}`,
                        date: new Date(),
                        lines: [
                            { accountCode: accounts.debitCode, debit: existingTx.amount, credit: 0, description: 'Bank/Cash' },
                            { accountCode: accounts.creditCode, debit: 0, credit: existingTx.amount, description: 'Customer Deposit Liability' }
                        ]
                    });

                    // Mark as posted successfully ONLY if the GL posting succeeds
                    await prisma.exportWalletTransaction.update({
                        where: { id: result.id },
                        data: { glPostingStatus: 'POSTED' }
                    });
                }
            }


        } catch (error: any) {
            console.error('[SYSTEM ALERT] GL Bridge error (wallet deposit cleared):', {
                tenantId: session.user.tenantId,
                eventType: 'CUSTOMER_DEPOSIT',
                transactionId: existingTx.id,
                error: error.message
            });

            const existingNote = result.adminNote?.trim() || '';
            const newErrorNote = `[SYSTEM ERROR] GL Posting Failed: ${error.message}`;
            await prisma.exportWalletTransaction.update({
                where: { id: result.id },
                data: {
                    adminNote: existingNote ? `${existingNote}\n${newErrorNote}` : newErrorNote,
                    glPostingStatus: 'FAILED'
                }
            });
        }

        return NextResponse.json({ transaction: result });
    } catch (error) {
        console.error('Transaction update error:', error);
        return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
    }
}
