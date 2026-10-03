import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { AccountType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();

        const { requirePermission } = await import('@/lib/auth');
        await requirePermission('accounting', 'view');

        const { searchParams } = new URL(request.url);
        const asOfDateParam = searchParams.get('asOfDate');

        // Default to current date if none provided
        const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();
        if (isNaN(asOfDate.getTime())) {
            return NextResponse.json({ error: 'Invalid asOfDate parameter' }, { status: 400 });
        }
        asOfDate.setHours(23, 59, 59, 999);

        // Balance Sheet only includes ASSET, LIABILITY, and EQUITY
        const journalLines = await prisma.journalLine.findMany({
            where: {
                journalEntry: {
                    tenantId: tenant.id,
                    status: 'POSTED',
                    entryDate: {
                        lte: asOfDate
                    }
                },
                account: {
                    type: {
                        in: ['ASSET', 'LIABILITY', 'EQUITY']
                    }
                }
            },
            include: {
                account: true
            }
        });

        // Also need Retained Earnings (Net Income of all prior periods + current period up to date)
        // To calculate Retained Earnings simply, run a mini P&L up to asOfDate
        const plLines = await prisma.journalLine.findMany({
            where: {
                journalEntry: {
                    tenantId: tenant.id,
                    status: 'POSTED',
                    entryDate: {
                        lte: asOfDate
                    }
                },
                account: {
                    type: {
                        in: ['REVENUE', 'EXPENSE']
                    }
                }
            },
            include: { account: true }
        });

        let retainedEarnings = 0;
        for (const line of plLines) {
            if (line.account.type === 'REVENUE') {
                retainedEarnings += (line.credit > 0 ? line.baseCurrency : -line.baseCurrency);
            } else if (line.account.type === 'EXPENSE') {
                retainedEarnings -= (line.debit > 0 ? line.baseCurrency : -line.baseCurrency);
            }
        }

        // Aggregate BS accounts
        const assets = new Map();
        const liabilities = new Map();
        const equity = new Map();

        let totalAssets = 0;
        let totalLiabilities = 0;
        let totalEquity = retainedEarnings;

        for (const line of journalLines) {
            const type = line.account.type;
            const absValue = line.baseCurrency;
            const isDebit = line.debit > 0;

            let val = 0;
            let targetMap;

            if (type === 'ASSET') {
                val = isDebit ? absValue : -absValue;
                targetMap = assets;
                totalAssets += val;
            } else if (type === 'LIABILITY') {
                val = isDebit ? -absValue : absValue; // Credit is normal balance
                targetMap = liabilities;
                totalLiabilities += val;
            } else if (type === 'EQUITY') {
                val = isDebit ? -absValue : absValue; // Credit is normal balance
                targetMap = equity;
                totalEquity += val;
            }

            if (targetMap) {
                if (!targetMap.has(line.accountId)) {
                    targetMap.set(line.accountId, { id: line.account.id, code: line.account.code, name: line.account.name, total: 0 });
                }
                targetMap.get(line.accountId).total += val;
            }
        }

        // Append Retained Earnings to Equity Section
        const formattedEquity = Array.from(equity.values()).sort((a, b) => a.code.localeCompare(b.code));
        // Use a clearly synthetic, non-conflicting code for calculated retained earnings
        const reCode = `_CALC_RE-${tenant.id.substring(0, 8)}`;
        formattedEquity.push({
            id: 'retained-earnings-calc',
            code: reCode,
            name: 'Retained Earnings (Calculated)',
            total: retainedEarnings
        });

        return NextResponse.json({
            asOfDate,
            assets: Array.from(assets.values()).sort((a, b) => a.code.localeCompare(b.code)),
            liabilities: Array.from(liabilities.values()).sort((a, b) => a.code.localeCompare(b.code)),
            equity: formattedEquity,
            totalAssets,
            totalLiabilities,
            totalEquity,
            isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
        });

    } catch (error) {
        console.error('Error generating Balance Sheet:', error);
        return NextResponse.json({ error: 'Failed to generate Balance Sheet' }, { status: 500 });
    }
}
