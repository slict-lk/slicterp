import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const reportType = searchParams.get('type') || 'sales-summary';
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        const tenantId = user.tenantId;
        const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = dateTo ? new Date(dateTo + 'T23:59:59') : new Date();

        let reportData: Record<string, unknown> = {};

        switch (reportType) {
            case 'sales-summary':
                reportData = await getSalesSummary(tenantId, startDate, endDate);
                break;
            case 'top-products':
                reportData = await getTopProducts(tenantId, startDate, endDate);
                break;
            case 'customer-analysis':
                reportData = await getCustomerAnalysis(tenantId, startDate, endDate);
                break;
            case 'inventory-status':
                reportData = await getInventoryStatus(tenantId);
                break;
            case 'daily-sales':
                reportData = await getDailySales(tenantId, startDate, endDate);
                break;
            case 'profit-margin':
                reportData = await getProfitMargin(tenantId, startDate, endDate);
                break;
            default:
                return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
        }

        return NextResponse.json({
            reportType,
            dateRange: { from: startDate, to: endDate },
            generatedAt: new Date(),
            data: reportData,
        });
    } catch (error) {
        console.error('Error generating report:', error);
        return NextResponse.json(
            { error: 'Failed to generate report' },
            { status: 500 }
        );
    }
}

async function getSalesSummary(tenantId: string, startDate: Date, endDate: Date) {
    // Get all completed invoices in date range
    const invoices = await (prisma as any).shopInvoice.findMany({
        where: {
            tenantId,
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate },
        },
        include: { items: true },
    });

    const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0);
    const totalCost = invoices.reduce((sum: number, inv: any) => {
        return sum + inv.items.reduce((itemSum: number, item: any) =>
            itemSum + (Number(item.costPrice || 0) * Number(item.quantity || 0)), 0
        );
    }, 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
        summary: {
            totalTransactions: invoices.length,
            totalRevenue,
            totalCost,
            totalProfit,
            profitMargin: profitMargin.toFixed(2),
            averageOrderValue: invoices.length > 0 ? totalRevenue / invoices.length : 0,
        },
        byPaymentStatus: {
            paid: invoices.filter((i: any) => i.paymentStatus === 'PAID').length,
            partial: invoices.filter((i: any) => i.paymentStatus === 'PARTIAL').length,
            unpaid: invoices.filter((i: any) => i.paymentStatus === 'UNPAID').length,
        },
    };
}

async function getTopProducts(tenantId: string, startDate: Date, endDate: Date) {
    // Get invoice items from completed invoices
    const items = await (prisma as any).shopInvoiceItem.findMany({
        where: {
            invoice: {
                tenantId,
                status: 'COMPLETED',
                createdAt: { gte: startDate, lte: endDate },
            },
        },
        select: {
            productId: true,
            productName: true,
            productSku: true,
            quantity: true,
            lineTotal: true,
            costPrice: true,
        },
    });

    // Aggregate by product
    const productMap = new Map<string, any>();
    items.forEach((item: any) => {
        const existing = productMap.get(item.productId) || {
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            totalQuantity: 0,
            totalRevenue: 0,
            totalCost: 0,
        };
        existing.totalQuantity += Number(item.quantity || 0);
        existing.totalRevenue += Number(item.lineTotal || 0);
        existing.totalCost += Number(item.costPrice || 0) * Number(item.quantity || 0);
        productMap.set(item.productId, existing);
    });

    // Sort by revenue
    const topByRevenue = Array.from(productMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

    // Sort by quantity
    const topByQuantity = Array.from(productMap.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);

    return { topByRevenue, topByQuantity };
}

async function getCustomerAnalysis(tenantId: string, startDate: Date, endDate: Date) {
    const customers = await (prisma as any).shopCustomer.findMany({
        where: { tenantId },
        include: {
            invoices: {
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate, lte: endDate },
                },
            },
        },
    });

    const customerData = customers.map((customer: any) => {
        const totalSpent = customer.invoices.reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0);
        return {
            id: customer.id,
            name: customer.name,
            customerNumber: customer.customerNumber,
            customerType: customer.customerType,
            transactionCount: customer.invoices.length,
            totalSpent,
            loyaltyPoints: customer.loyaltyPoints || 0,
        };
    }).filter((c: any) => c.transactionCount > 0);

    // Sort by total spent
    const topCustomers = customerData.sort((a: any, b: any) => b.totalSpent - a.totalSpent).slice(0, 10);

    // Group by customer type
    const byType: Record<string, { count: number; revenue: number }> = {};
    customerData.forEach((c: any) => {
        if (!byType[c.customerType]) {
            byType[c.customerType] = { count: 0, revenue: 0 };
        }
        byType[c.customerType].count++;
        byType[c.customerType].revenue += c.totalSpent;
    });

    return {
        totalActiveCustomers: customerData.length,
        topCustomers,
        byCustomerType: byType,
    };
}

async function getInventoryStatus(tenantId: string) {
    const products = await (prisma as any).sparePart.findMany({
        where: { tenantId, isActive: true },
        select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            stockQty: true,
            minStockQty: true,
            costPrice: true,
            salePrice: true,
        },
    });

    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum: number, p: any) => sum + (p.stockQty * p.costPrice), 0);
    const lowStockItems = products.filter((p: any) => p.stockQty > 0 && p.stockQty <= p.minStockQty);
    const outOfStockItems = products.filter((p: any) => p.stockQty === 0);
    const healthyStockItems = products.filter((p: any) => p.stockQty > p.minStockQty);

    // Group by category
    const byCategory: Record<string, { count: number; value: number }> = {};
    products.forEach((p: any) => {
        const cat = p.category || 'Uncategorized';
        if (!byCategory[cat]) {
            byCategory[cat] = { count: 0, value: 0 };
        }
        byCategory[cat].count++;
        byCategory[cat].value += p.stockQty * p.costPrice;
    });

    return {
        summary: {
            totalProducts,
            totalStockValue,
            lowStockCount: lowStockItems.length,
            outOfStockCount: outOfStockItems.length,
            healthyStockCount: healthyStockItems.length,
        },
        lowStockItems: lowStockItems.slice(0, 20),
        outOfStockItems: outOfStockItems.slice(0, 20),
        byCategory,
    };
}

async function getDailySales(tenantId: string, startDate: Date, endDate: Date) {
    const invoices = await (prisma as any).shopInvoice.findMany({
        where: {
            tenantId,
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Group by date
    const dailyData: Record<string, { date: string; transactions: number; revenue: number }> = {};

    invoices.forEach((inv: any) => {
        const date = new Date(inv.createdAt).toISOString().split('T')[0];
        if (!dailyData[date]) {
            dailyData[date] = { date, transactions: 0, revenue: 0 };
        }
        dailyData[date].transactions++;
        dailyData[date].revenue += Number(inv.total || 0);
    });

    const dailySales = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    return {
        dailySales,
        totalDays: dailySales.length,
        averageDailyRevenue: dailySales.length > 0
            ? dailySales.reduce((sum, d) => sum + d.revenue, 0) / dailySales.length
            : 0,
    };
}

async function getProfitMargin(tenantId: string, startDate: Date, endDate: Date) {
    const items = await (prisma as any).shopInvoiceItem.findMany({
        where: {
            invoice: {
                tenantId,
                status: 'COMPLETED',
                createdAt: { gte: startDate, lte: endDate },
            },
        },
    });

    // Fetch product categories
    const productIds = [...new Set(items.map((item: any) => item.productId))];
    const productsInfo = await (prisma as any).sparePart.findMany({
        where: { id: { in: productIds } },
        select: { id: true, category: true }
    });
    const categoryMapRef = new Map(productsInfo.map((p: any) => [p.id, p.category]));

    // Aggregate by product
    const productMap = new Map<string, any>();
    items.forEach((item: any) => {
        const existing = productMap.get(item.productId) || {
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            category: categoryMapRef.get(item.productId) || 'Uncategorized',
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
        };
        const revenue = Number(item.lineTotal || 0);
        const cost = Number(item.costPrice || 0) * Number(item.quantity || 0);
        existing.totalRevenue += revenue;
        existing.totalCost += cost;
        existing.totalProfit += (revenue - cost);
        productMap.set(item.productId, existing);
    });

    const products = Array.from(productMap.values()).map(p => ({
        ...p,
        marginPercent: p.totalRevenue > 0 ? ((p.totalProfit / p.totalRevenue) * 100).toFixed(2) : '0',
    }));

    // Sort by profit
    const byProfit = [...products].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 10);

    // Sort by margin percentage
    const byMargin = [...products].sort((a, b) => Number(b.marginPercent) - Number(a.marginPercent)).slice(0, 10);

    // Aggregate by category
    const categoryMap = new Map<string, any>();
    products.forEach(p => {
        const existing = categoryMap.get(p.category) || {
            category: p.category,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
        };
        existing.totalRevenue += p.totalRevenue;
        existing.totalCost += p.totalCost;
        existing.totalProfit += p.totalProfit;
        categoryMap.set(p.category, existing);
    });

    const byCategory = Array.from(categoryMap.values()).map(c => ({
        ...c,
        marginPercent: c.totalRevenue > 0 ? ((c.totalProfit / c.totalRevenue) * 100).toFixed(2) : '0',
    }));

    return { topByProfit: byProfit, topByMargin: byMargin, byCategory };
}
