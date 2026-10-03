import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();

        // Auth Check
        const { requirePermission } = await import('@/lib/auth');
        await requirePermission('accounting', 'view');

        const { searchParams } = new URL(request.url);
        const asOfDateParam = searchParams.get('asOfDate');
        const endDate = asOfDateParam ? new Date(asOfDateParam) : new Date();
        if (isNaN(endDate.getTime())) {
            return NextResponse.json({ error: 'Invalid asOfDate parameter' }, { status: 400 });
        }

        // Set to end of day in UTC for consistency
        endDate.setUTCHours(23, 59, 59, 999);

        // Get all POSTED journal lines up to the date
        const journalLines = await prisma.journalLine.findMany({
            where: {
                journalEntry: {
                    tenantId: tenant.id,
                    status: 'POSTED',
                    entryDate: {
                        lte: endDate
                    }
                }
            },
            include: {
                account: true
            }
        });

        // Aggregate balances by account
        const accountBalances = new Map<string, {
            id: string;
            code: string;
            name: string;
            type: string;
            normalBalance: string;
            debit: number;
            credit: number;
            balance: number;
        }>();

        for (const line of journalLines) {
            if (!accountBalances.has(line.accountId)) {
                accountBalances.set(line.accountId, {
                    id: line.account.id,
                    code: line.account.code,
                    name: line.account.name,
                    type: line.account.type,
                    normalBalance: line.account.normalBalance,
                    debit: 0,
                    credit: 0,
                    balance: 0,
                });
            }

            const acct = accountBalances.get(line.accountId)!;

            // Sanitize baseCurrency to prevent NaN propagation
            const rawValue = Number(line.baseCurrency);
            const value = Number.isFinite(rawValue) ? rawValue : 0;

            // For presentation in columns, we need absolute values
            const absValue = Math.abs(value);

            if (line.debit > 0) {
                acct.debit += absValue;
            } else if (line.credit > 0) {
                acct.credit += absValue;
            }
        }

        let totalDebit = 0;
        let totalCredit = 0;

        // Calculate final balances based on normal balance rules
        const results = Array.from(accountBalances.values()).map(acct => {
            // For Trial Balance, we just want the net in the correct column
            const net = acct.debit - acct.credit;

            let finalDebit = 0;
            let finalCredit = 0;

            if (net > 0) {
                finalDebit = net;
            } else if (net < 0) {
                finalCredit = Math.abs(net);
            }

            // Track totals
            totalDebit += finalDebit;
            totalCredit += finalCredit;

            return {
                ...acct,
                debit: finalDebit,
                credit: finalCredit,
                balance: acct.normalBalance === 'DEBIT' ? net : -net,
            };
        }).filter(a => a.debit !== 0 || a.credit !== 0) // Hide zero balance accounts
            .sort((a, b) => a.code.localeCompare(b.code));

        // Balance tolerance for floating-point comparison (0.005 provides sub-cent precision)
        const BALANCE_EPSILON = 0.005;

        return NextResponse.json({
            asOfDate: endDate,
            accounts: results,
            totalDebit: totalDebit,
            totalCredit: totalCredit,
            isBalanced: Math.abs(totalDebit - totalCredit) < BALANCE_EPSILON
        });

    } catch (error: any) {
        if (error.message === 'Forbidden: Insufficient Permissions' || error?.code === 'INSUFFICIENT_PERMISSIONS') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        console.error('Error generating Trial Balance:', error);
        return NextResponse.json({ error: 'Failed to generate Trial Balance' }, { status: 500 });
    }
}
