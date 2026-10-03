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
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        // Default to current year if no dates provided
        const now = new Date();
        const startDate = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), 0, 1);
        const endDate = endDateParam ? new Date(endDateParam) : new Date();

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json({ error: 'Invalid startDate or endDate parameters' }, { status: 400 });
        }

        endDate.setHours(23, 59, 59, 999);

        // Get all POSTED journal lines within the date range for REVENUE and EXPENSE accounts
        const journalLines = await prisma.journalLine.findMany({
            where: {
                journalEntry: {
                    tenantId: tenant.id,
                    status: 'POSTED',
                    entryDate: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                account: {
                    type: {
                        in: ['REVENUE', 'EXPENSE']
                    }
                }
            },
            include: {
                account: true
            }
        });

        // Aggregate
        let totalRevenue = 0;
        let totalExpense = 0;
        const revenues = new Map();
        const expenses = new Map();

        for (const line of journalLines) {
            // Revenue accounts usually have CREDIT normal balances, so credit increases it.
            // Expense accounts usually have DEBIT normal balances, so debit increases it.

            const absValue = line.baseCurrency; // Use base currency for reporting
            const isCredit = line.credit > 0;

            if (line.account.type === 'REVENUE') {
                // Credit increases revenue
                const val = isCredit ? absValue : -absValue;
                if (!revenues.has(line.accountId)) {
                    revenues.set(line.accountId, { id: line.account.id, code: line.account.code, name: line.account.name, total: 0 });
                }
                revenues.get(line.accountId).total += val;
                totalRevenue += val;
            } else if (line.account.type === 'EXPENSE') {
                // Debit increases expense
                const val = isCredit ? -absValue : absValue;
                if (!expenses.has(line.accountId)) {
                    expenses.set(line.accountId, { id: line.account.id, code: line.account.code, name: line.account.name, total: 0 });
                }
                expenses.get(line.accountId).total += val;
                totalExpense += val;
            }
        }

        return NextResponse.json({
            startDate,
            endDate,
            revenues: Array.from(revenues.values()).sort((a, b) => a.code.localeCompare(b.code)),
            expenses: Array.from(expenses.values()).sort((a, b) => a.code.localeCompare(b.code)),
            totalRevenue,
            totalExpense,
            netProfit: totalRevenue - totalExpense
        });

    } catch (error) {
        console.error('Error generating Profit & Loss:', error);
        return NextResponse.json({ error: 'Failed to generate Profit & Loss' }, { status: 500 });
    }
}
