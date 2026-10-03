import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/accounting/reports/module-summary?startDate=...&endDate=...
 *
 * Returns aggregated financial data grouped by sourceModule.
 * Used by the multi-module accounting dashboard.
 */
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const tenantId = session.user.tenantId;
        const { searchParams } = new URL(request.url);

        // Default to current month if no dates provided
        const now = new Date();
        const startDate = searchParams.get('startDate')
            ? new Date(searchParams.get('startDate')!)
            : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const endDate = searchParams.get('endDate')
            ? new Date(searchParams.get('endDate')!)
            : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }

        // Fetch tenant's enabled modules
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { enabledModules: true, baseCurrency: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        // Fetch all journal entries for the period, grouped by sourceModule
        const journalEntries = await prisma.journalEntry.findMany({
            where: {
                tenantId,
                status: 'POSTED',
                entryDate: { gte: startDate, lte: endDate },
                sourceModule: { not: null },
            },
            include: {
                lines: {
                    include: {
                        account: { select: { type: true, code: true } }
                    }
                }
            }
        });

        // Aggregate per module
        const moduleData = new Map<string, {
            slug: string;
            revenue: number;
            expenses: number;
            receivables: number;
            payables: number;
            transactionCount: number;
        }>();

        for (const entry of journalEntries) {
            const mod = entry.sourceModule!;
            if (!moduleData.has(mod)) {
                moduleData.set(mod, {
                    slug: mod,
                    revenue: 0,
                    expenses: 0,
                    receivables: 0,
                    payables: 0,
                    transactionCount: 0,
                });
            }

            const data = moduleData.get(mod)!;
            data.transactionCount++;

            for (const line of entry.lines) {
                const amount = Number(line.baseCurrency ?? (line.debit > 0 ? line.debit : line.credit));

                switch (line.account.type) {
                    case 'REVENUE':
                        data.revenue += line.credit > 0 ? amount : -amount;
                        break;
                    case 'EXPENSE':
                        data.expenses += line.debit > 0 ? amount : -amount;
                        break;
                    case 'ASSET':
                        // AR accounts (1200 prefix)
                        if (line.account.code.startsWith('1200')) {
                            data.receivables += line.debit > 0 ? amount : -amount;
                        }
                        break;
                    case 'LIABILITY':
                        // AP accounts (2000 prefix)
                        if (line.account.code.startsWith('2000')) {
                            data.payables += line.credit > 0 ? amount : -amount;
                        }
                        break;
                }
            }
        }

        // Also fetch monthly breakdown for chart
        const monthlyData = await getMonthlyBreakdown(tenantId, startDate, endDate);

        // Build response
        const modules = Array.from(moduleData.values())
            .sort((a, b) => b.revenue - a.revenue);

        const consolidated = {
            totalRevenue: modules.reduce((sum, m) => sum + m.revenue, 0),
            totalExpenses: modules.reduce((sum, m) => sum + m.expenses, 0),
            totalReceivables: modules.reduce((sum, m) => sum + m.receivables, 0),
            totalPayables: modules.reduce((sum, m) => sum + m.payables, 0),
            netProfit: modules.reduce((sum, m) => sum + (m.revenue - m.expenses), 0),
            totalTransactions: modules.reduce((sum, m) => sum + m.transactionCount, 0),
        };

        // Fetch recent GL entries for the activity feed
        const recentEntries = await prisma.journalEntry.findMany({
            where: {
                tenantId,
                status: 'POSTED',
                sourceModule: { not: null },
            },
            select: {
                id: true,
                reference: true,
                description: true,
                sourceModule: true,
                sourceDocumentType: true,
                sourceDocumentId: true,
                entryDate: true,
                createdAt: true,
                lines: {
                    select: { debit: true, credit: true, baseCurrency: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        const recentGLEntries = recentEntries.map(e => ({
            id: e.id,
            reference: e.reference,
            description: e.description,
            sourceModule: e.sourceModule,
            sourceDocumentType: e.sourceDocumentType,
            sourceDocumentId: e.sourceDocumentId,
            date: e.entryDate,
            createdAt: e.createdAt,
            totalAmount: e.lines.reduce((sum, l) => sum + l.debit, 0),
        }));

        return NextResponse.json({
            modules,
            consolidated,
            monthlyData,
            recentGLEntries,
            enabledModules: tenant.enabledModules,
            baseCurrency: tenant.baseCurrency,
            period: { startDate, endDate },
        });
    } catch (error: any) {
        console.error('[Module Summary] Error:', error);
        return NextResponse.json({ error: 'Failed to generate module summary' }, { status: 500 });
    }
}

/**
 * Helper: Monthly revenue breakdown by module for the chart
 */
async function getMonthlyBreakdown(
    tenantId: string,
    startDate: Date,
    endDate: Date
): Promise<Array<{ month: string;[moduleSlug: string]: number | string }>> {
    // Get 6 months of data ending at endDate, but respect startDate as a floor
    const sixMonthsAgo = new Date(endDate);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const effectiveStart = startDate > sixMonthsAgo ? startDate : sixMonthsAgo;

    const entries = await prisma.journalEntry.findMany({
        where: {
            tenantId,
            status: 'POSTED',
            entryDate: { gte: effectiveStart, lte: endDate },
            sourceModule: { not: null },
        },
        include: {
            lines: {
                include: {
                    account: { select: { type: true } }
                }
            }
        }
    });

    // Group by month + module
    const monthlyMap = new Map<string, Map<string, number>>();

    for (const entry of entries) {
        const monthKey = `${entry.entryDate.getFullYear()}-${String(entry.entryDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, new Map());
        }

        const moduleMap = monthlyMap.get(monthKey)!;
        const mod = entry.sourceModule!;

        if (!moduleMap.has(mod)) moduleMap.set(mod, 0);

        for (const line of entry.lines) {
            if (line.account.type === 'REVENUE' && line.credit > 0) {
                const amount = Number(line.baseCurrency ?? line.credit);
                moduleMap.set(mod, (moduleMap.get(mod) || 0) + amount);
            }
        }
    }

    // Convert to array sorted by month
    const months = Array.from(monthlyMap.keys()).sort();
    return months.map(month => {
        const moduleMap = monthlyMap.get(month)!;
        const row: any = { month };
        moduleMap.forEach((revenue, mod) => {
            row[mod] = Math.round(revenue * 100) / 100;
        });
        return row;
    });
}
