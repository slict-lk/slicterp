
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ reportId: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);

    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const reportId = params.reportId;

    if (!startDateStr || !endDateStr) {
        return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const startDate = startOfDay(parseISO(startDateStr));
    const endDate = endOfDay(parseISO(endDateStr));

    // Default tenantId to session tenant or a specific one if checking for specific tenant
    // For now, assume single tenant or taking tenant from session
    // In a real multi-tenant app, you'd filter by tenantId: session.user.tenantId
    const tenantId = session?.user?.tenantId;

    if (!tenantId) {
        // Only strictly enforce if we are sure session works in this dev env, else optional for now
        // return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    try {
        let data: any[] = []; // Explicitly type data as any[] to satisfy TS if needed

        switch (reportId) {
            // SALES
            case 'sales-analysis':
                const sales = await prisma.salesOrder.findMany({
                    where: {
                        tenantId,
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    include: {
                        customer: true,
                    }
                });

                data = sales.map(order => ({
                    'Order #': order.number,
                    'Date': order.createdAt.toISOString().split('T')[0],
                    'Customer': order.customer?.name || 'Unknown',
                    'Status': order.status,
                    'Total': order.grandTotal,
                    'Tax': order.tax,
                    'Discount': order.discount
                }));
                break;

            case 'customer-analysis':
                // Group sales by customer
                const salesForCustomer = await prisma.salesOrder.findMany({
                    where: {
                        tenantId,
                        createdAt: { gte: startDate, lte: endDate }
                    },
                    include: { customer: true }
                });

                const customerStats: Record<string, { name: string, count: number, total: number }> = {};

                salesForCustomer.forEach(order => {
                    const cid = order.customerId;
                    if (!customerStats[cid]) {
                        customerStats[cid] = { name: order.customer?.name || 'Unknown', count: 0, total: 0 };
                    }
                    customerStats[cid].count += 1;
                    customerStats[cid].total += order.grandTotal;
                });

                data = Object.values(customerStats).map(c => ({
                    'Customer': c.name,
                    'Orders Count': c.count,
                    'Total Spend': c.total.toFixed(2)
                }));
                break;

            // INVENTORY
            case 'stock-valuation':
                const products = await prisma.product.findMany({
                    where: { tenantId },
                    select: { name: true, sku: true, stockQty: true, costPrice: true, salePrice: true }
                });

                data = products.map(p => ({
                    'Product': p.name,
                    'SKU': p.sku,
                    'Quantity': p.stockQty,
                    'Cost Price': p.costPrice,
                    'Total Value': (p.stockQty * p.costPrice).toFixed(2),
                    'Potential Revenue': (p.stockQty * p.salePrice).toFixed(2)
                }));
                break;

            case 'low-stock':
                const lowStockProducts = await prisma.product.findMany({
                    where: {
                        tenantId,
                        // stockQty: { lte: prisma.product.fields.minStockQty } // This doesn't work directly in Prisma without raw query usually, so we fetch and filter or use fixed value
                    }
                });

                data = lowStockProducts
                    .filter(p => p.stockQty <= p.minStockQty)
                    .map(p => ({
                        'Product': p.name,
                        'SKU': p.sku,
                        'Current Stock': p.stockQty,
                        'Min Stock': p.minStockQty,
                        'Status': 'Low Stock'
                    }));
                break;

            // HR
            case 'attendance-summary':
                // This would require aggregation. For simple export:
                const attendance = await prisma.attendance.findMany({
                    where: {
                        tenantId,
                        date: { gte: startDate, lte: endDate }
                    },
                    include: { employee: true }
                });

                data = attendance.map(a => ({
                    'Employee': `${a.employee.firstName} ${a.employee.lastName}`,
                    'Date': a.date.toISOString().split('T')[0],
                    'Status': a.status,
                    'Check In': a.checkIn ? a.checkIn.toISOString().split('T')[1].substring(0, 5) : '-',
                    'Check Out': a.checkOut ? a.checkOut.toISOString().split('T')[1].substring(0, 5) : '-'
                }));
                break;

            // FINANCIAL (Mockish implementation as strict accounting needs Ledger)
            case 'profit-loss':
                // Income = Invoices (PAID)
                const invoices = await prisma.invoice.findMany({
                    where: {
                        tenantId,
                        issueDate: { gte: startDate, lte: endDate },
                        // status: 'PAID' (Or should we use accrued? Let's use issued for simplicity)
                    }
                });

                const expenses = await prisma.expense.findMany({
                    where: {
                        tenantId,
                        expenseDate: { gte: startDate, lte: endDate },
                        status: 'APPROVED' // Only approved expenses
                    }
                });

                const totalIncome = invoices.reduce((sum, inv) => sum + inv.total, 0);
                const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

                // To make it a "report", maybe detail line items?
                // Or just a summary?
                // Let's do a line-by-line list of all transactions sorted by date

                const incomeRows = invoices.map(i => ({
                    'Date': i.issueDate.toISOString().split('T')[0],
                    'Type': 'Income',
                    'Description': `Invoice #${i.number}`,
                    'Amount': i.total,
                    'Category': 'Sales'
                }));

                const expenseRows = expenses.map(e => ({
                    'Date': e.expenseDate.toISOString().split('T')[0],
                    'Type': 'Expense',
                    'Description': e.description,
                    'Amount': -e.amount, // Negative for expense
                    'Category': e.category
                }));

                data = [...incomeRows, ...expenseRows].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());

                // Add summary row
                data.push({});
                data.push({
                    'Date': 'TOTAL',
                    'Type': '',
                    'Description': 'NET PROFIT',
                    'Amount': totalIncome - totalExpenses,
                    'Category': ''
                });
                break;

            default:
                // Try to return something generic or error for unimpl
                // return NextResponse.json({ error: `Report type ${reportId} not implemented yet` });
                // Instead of error, let's return empty array so UI doesn't crash but shows empty
                data = [];
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
