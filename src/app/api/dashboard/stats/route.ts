import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { startOfMonth, subMonths, format, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let tenantId = searchParams.get('tenantId');

    // If no tenantId provided, get or create default tenant
    if (!tenantId || tenantId === 'demo-tenant-id') {
      const tenant = await getOrCreateDefaultTenant();
      tenantId = tenant.id;
    }

    // 1. Fetch Tenant to check enabled modules and trial status
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { enabledModules: true, trialEnd: true, subscriptionEnd: true }
    });

    const isPosEnabled = tenant?.enabledModules.includes('pos');
    const isHotelEnabled = tenant?.enabledModules.includes('hotel');
    const isRealEstateEnabled = tenant?.enabledModules.includes('properties'); // or 'realestate'
    // 'sales' usually uses Invoices

    // 2. Aggregate Revenue (Last 6 Months Trend + Total)
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      return {
        name: format(d, 'MMM'),
        date: d,
        start: startOfMonth(d),
        end: endOfMonth(d),
        value: 0
      };
    });

    const startDate = months[0].start;

    // Parallel Queries for Revenue
    const [
      invoiceRevenue,
      posRevenue,
      hotelRevenue
    ] = await Promise.all([
      // General Invoices (Sales, Services, Real Estate)
      prisma.invoice.findMany({
        where: {
          tenantId,
          status: 'PAID',
          issueDate: { gte: startDate }
        },
        select: { total: true, issueDate: true }
      }),
      // POS Orders
      prisma.pOSOrder.findMany({
        where: {
          tenantId,
          status: { in: ['PAID', 'COMPLETED'] },
          createdAt: { gte: startDate }
        },
        select: { total: true, createdAt: true }
      }),
      // Hotel Bookings (Paid Amount)
      prisma.hotelBooking.findMany({
        where: {
          tenantId,
          paidAmount: { gt: 0 },
          createdAt: { gte: startDate } // Use createdAt or checkIn? Using createdAt for booking revenue timing
        },
        select: { paidAmount: true, createdAt: true }
      })
    ]);

    // Calculate Total Revenue (All Time - approximation or just fetch separate count?)
    // For "Total Revenue" card, we usually want All Time.
    // Let's do a separate aggregate for All Time Total if needed, 
    // OR just use the 6 months if the card implies "Current Period".
    // The previous implementation used aggregate on POSOrder only.
    // Let's do a quick aggregate for All Time Total across modules.
    const [totalInvoice, totalPos, totalHotel] = await Promise.all([
      prisma.invoice.aggregate({ where: { tenantId, status: 'PAID' }, _sum: { total: true } }),
      prisma.pOSOrder.aggregate({ where: { tenantId, status: { in: ['PAID', 'COMPLETED'] } }, _sum: { total: true } }),
      prisma.hotelBooking.aggregate({ where: { tenantId }, _sum: { paidAmount: true } })
    ]);

    const totalRevenue = (totalInvoice._sum.total || 0) +
      (totalPos._sum.total || 0) +
      (totalHotel._sum.paidAmount || 0);

    // Map Revenue to Trend Chart
    invoiceRevenue.forEach(inv => {
      const month = months.find(m => inv.issueDate >= m.start && inv.issueDate <= m.end);
      if (month) month.value += inv.total;
    });
    posRevenue.forEach(order => {
      const month = months.find(m => order.createdAt >= m.start && order.createdAt <= m.end);
      if (month) month.value += order.total;
    });
    hotelRevenue.forEach(booking => {
      const month = months.find(m => booking.createdAt >= m.start && booking.createdAt <= m.end);
      if (month) month.value += booking.paidAmount;
    });

    // 3. Recent Activity (Consolidated)
    // Fetch top 5 from each, then merge and sort
    const [recentInvoices, recentPos, recentBookings] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } }
      }),
      prisma.pOSOrder.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } }
      }),
      prisma.hotelBooking.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const activity = [
      ...recentInvoices.map(i => ({
        id: i.id,
        type: 'Invoice',
        description: `Invoice #${i.number}`,
        customer: i.customer?.name || 'Unknown',
        amount: i.total,
        status: i.status,
        date: i.createdAt
      })),
      ...recentPos.map(p => ({
        id: p.id,
        type: 'Order',
        description: `Order #${p.orderNumber}`,
        customer: p.customer?.name || 'Walk-in',
        amount: p.total,
        status: p.status,
        date: p.createdAt
      })),
      ...recentBookings.map(b => ({
        id: b.id,
        type: 'Booking',
        description: `Booking #${b.bookingNumber}`,
        customer: b.guestName,
        amount: b.totalAmount, // Use total amount for activity value
        status: b.status,
        date: b.createdAt
      }))
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Start with 5, frontend can show more if needed

    // 4. Counts
    const customerCount = await prisma.customer.count({ where: { tenantId } });
    const productCount = await prisma.product.count({ where: { tenantId } });
    const bookingCount = await prisma.hotelBooking.count({ where: { tenantId } });
    const orderCountQuery = await prisma.pOSOrder.count({ where: { tenantId } });

    // Dynamic Order Count (Sales Orders + POS Orders + Bookings?)
    // Let's just sum them up for "Total Actions" or keep them separate?
    // The metric card says "Total Orders". 
    // If Hotel, maybe Bookings?
    const totalOrders = orderCountQuery + bookingCount;

    // 5. System Health
    const trialEnd = tenant?.trialEnd ? new Date(tenant.trialEnd) : null;
    let trialDaysRemaining = 0;
    if (trialEnd) {
      const diffTime = trialEnd.getTime() - new Date().getTime();
      trialDaysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      stats: {
        totalRevenue,
        revenueChange: 12.5, // Mock change for now, or calc diff
        customerCount,
        orderCount: totalOrders,
        productCount,
      },
      revenueTrend: months.map(m => ({ name: m.name, value: m.value })),
      recentActivity: activity,
      systemHealth: {
        trialDaysRemaining,
        isTrial: !!trialEnd && trialDaysRemaining > 0,
        dbStatus: 'Operational', // If we are here, DB is working
        uptime: 99.9
      },
      manufacturing: {
        inProgress: 0, // Keep 0 if not fetched, or fetch if needed
        scheduled: 0,
        pending: 0
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

