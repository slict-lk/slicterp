import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { differenceInDays, startOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();

        // Auth Check
        const { requirePermission } = await import('@/lib/auth');
        await requirePermission('accounting', 'view');

        const { searchParams } = new URL(request.url);
        const asOfDateParam = searchParams.get('asOfDate');
        const typeParam = (searchParams.get('type') || 'AR').toUpperCase();

        if (typeParam !== 'AR' && typeParam !== 'AP') {
            return NextResponse.json({ error: 'type parameter must be AR or AP' }, { status: 400 });
        }

        const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();
        if (isNaN(asOfDate.getTime())) {
            return NextResponse.json({ error: 'Invalid asOfDate parameter' }, { status: 400 });
        }
        asOfDate.setHours(23, 59, 59, 999);

        const invoiceType = typeParam === 'AR' ? 'SALES' : 'PURCHASE';

        // Fetch open or partially paid invoices up to the asOfDate
        // It's considered outstanding if issueDate <= asOfDate and it wasn't fully paid as of asOfDate
        // This requires cross referencing payments up to asOfDate in a true point-in-time report.
        // For MVP phase 2, we use current amountDue > 0 and issueDate <= asOfDate

        const outstandingInvoices = await prisma.invoice.findMany({
            where: {
                tenantId: tenant.id,
                type: invoiceType,
                status: { in: ['OPEN', 'OVERDUE'] }, // DRAFT doesn't owe money, PAID owes 0
                issueDate: { lte: asOfDate },
                amountDue: { gt: 0 }
            },
            include: {
                customer: invoiceType === 'SALES',
                vendor: invoiceType === 'PURCHASE'
            },
            orderBy: { dueDate: 'asc' }
        });

        const agingBuckets = {
            'Current': 0,
            '1-30 Days': 0,
            '31-60 Days': 0,
            '61-90 Days': 0,
            '>90 Days': 0
        };

        const details = outstandingInvoices.map(inv => {
            const dueDate = startOfDay(inv.dueDate);
            const reportDate = startOfDay(asOfDate);

            const daysOverdue = differenceInDays(reportDate, dueDate);

            let bucket = 'Current';
            if (daysOverdue > 90) bucket = '>90 Days';
            else if (daysOverdue > 60) bucket = '61-90 Days';
            else if (daysOverdue > 30) bucket = '31-60 Days';
            else if (daysOverdue > 0) bucket = '1-30 Days';

            const safeExchangeRate = (inv.exchangeRate != null && Number(inv.exchangeRate) !== 0) ? Number(inv.exchangeRate) : 1;
            const amount = Number(inv.amountDue) * safeExchangeRate; // Base currency equivalent

            // @ts-ignore dynamic key assignment
            agingBuckets[bucket] += amount;

            return {
                id: inv.id,
                number: inv.number,
                partyId: invoiceType === 'SALES' ? inv.customerId : inv.vendorId,
                partyName: invoiceType === 'SALES' ? inv.customer?.name : inv.vendor?.name,
                issueDate: inv.issueDate,
                dueDate: inv.dueDate,
                daysOverdue,
                bucket,
                originalAmount: inv.total,
                amountDueBase: amount,
                currencyCode: inv.currencyCode,
                foreignAmount: inv.amountDue
            };
        });

        const totalOutstanding = Object.values(agingBuckets).reduce((a, b) => a + Number(b), 0);

        return NextResponse.json({
            asOfDate,
            type: `${typeParam} Aging`,
            summary: agingBuckets,
            totalOutstanding,
            details
        });

    } catch (error) {
        console.error(`Error generating Aging Report:`, error);
        return NextResponse.json({ error: `Failed to generate Aging Report` }, { status: 500 });
    }
}
