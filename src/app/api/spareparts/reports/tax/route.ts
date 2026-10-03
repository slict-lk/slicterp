
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        const now = new Date();
        const startDate = startDateParam ? parseISO(startDateParam) : startOfMonth(now);
        const endDate = endDateParam ? parseISO(endDateParam) : endOfMonth(now);

        // Fetch invoice items for the period
        const invoiceItems = await (prisma as any).shopInvoiceItem.findMany({
            where: {
                invoice: {
                    tenantId: user.tenantId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    },
                    status: {
                        in: ['CONFIRMED', 'COMPLETED', 'PAID'] // Include valid turnover statuses
                    }
                }
            },
            select: {
                taxRate: true,
                taxAmount: true,
                lineTotal: true
            }
        });

        // Aggregation
        const taxSummary = new Map<number, { taxableAmount: number; taxAmount: number }>();

        let totalTax = 0;
        let totalSales = 0;

        for (const item of invoiceItems) {
            const rate = Number(item.taxRate);
            const amount = Number(item.taxAmount);
            const total = Number(item.lineTotal); // Usually lineTotal is exclusive or inclusive? 
            // In checkout/route.ts: lineTotal = salePrice * qty. lineTax = lineTotal * rate / 100.
            // So lineTotal is EXCLUSIVE of tax basis.

            if (!taxSummary.has(rate)) {
                taxSummary.set(rate, { taxableAmount: 0, taxAmount: 0 });
            }

            const entry = taxSummary.get(rate)!;
            entry.taxableAmount += total;
            entry.taxAmount += amount;

            totalTax += amount;
            totalSales += total;
        }

        const summary = Array.from(taxSummary.entries()).map(([rate, data]) => ({
            rate,
            taxableAmount: data.taxableAmount,
            taxAmount: data.taxAmount
        })).sort((a, b) => b.rate - a.rate);

        return NextResponse.json({
            period: {
                start: startDate,
                end: endDate
            },
            summary,
            totalTax,
            totalSales
        });

    } catch (error) {
        console.error('[API] Error generating tax report:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
