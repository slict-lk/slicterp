
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

/**
 * Revenue-generating module IDs (Profit Centers).
 * Only these will appear in the Segment-Wise P&L Summary.
 * Each maps to unique revenue streams that flow through invoices, POS, bookings, etc.
 */
const PROFIT_CENTER_IDS = new Set([
  'sales',           // Direct sales orders & invoices
  'pos',             // Point-of-sale transactions
  'subscriptions',   // Recurring subscription revenue
  'cart',            // E-commerce / shopping cart orders
  'vehicle-export',  // Vehicle export trading revenue
  'automotive',      // Automotive parts & services
  'spareparts',      // Spare parts retail shop
  'hotel',           // Hotel booking revenue
  'restaurant',      // Restaurant dining revenue
  'healthcare',      // Healthcare consultation & pharmacy
  'properties',      // Real estate commissions & leasing
  'manufacturing',   // Manufacturing / production output
]);

/**
 * Cost-center module IDs (OpEx Departments).
 * These are displayed in the separate "Departmental Cost Centers" card.
 */
const COST_CENTER_IDS = new Set([
  'hr',              // Payroll, benefits, recruitment
  'accounting',      // Finance department overhead
  'purchasing',      // Procurement costs
  'marketing',       // Campaign & advertising spend
  'helpdesk',        // Support team costs
  'projects',        // Project operational costs
  'quality',         // Quality control overhead
]);

/**
 * Module ID → display name mapping for a clean UI
 */
const MODULE_LABELS: Record<string, string> = {
  sales: 'Sales',
  pos: 'Point of Sale',
  subscriptions: 'Subscriptions',
  cart: 'Shopping Cart',
  'vehicle-export': 'Vehicle Export',
  automotive: 'Automotive',
  spareparts: 'Spare Parts Shop',
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  healthcare: 'Healthcare',
  properties: 'Real Estate',
  manufacturing: 'Manufacturing',
  hr: 'Human Resources',
  accounting: 'Accounting',
  purchasing: 'Purchasing',
  marketing: 'Marketing',
  helpdesk: 'Support',
  projects: 'Projects',
  quality: 'Quality Control',
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'month';

  const now = new Date();
  let startDate: Date, endDate: Date;

  if (period === 'year') {
    startDate = startOfYear(now);
    endDate = endOfYear(now);
  } else {
    startDate = startOfMonth(now);
    endDate = endOfMonth(now);
  }

  const enabledModuleIds: string[] = session.user.enabledModuleIds || [];

  try {
    // ─── Parallel data fetching for performance ───
    const [invoiceLines, expenses, ticketCount, projectStats, leadCount] = await Promise.all([
      // 1. Invoice lines → Revenue & COGS
      prisma.invoiceLine.findMany({
        where: {
          invoice: {
            tenantId,
            issueDate: { gte: startDate, lte: endDate },
          }
        },
        include: { product: true }
      }),

      // 2. Approved expenses → OpEx
      prisma.expense.findMany({
        where: {
          tenantId,
          expenseDate: { gte: startDate, lte: endDate },
          status: 'APPROVED'
        }
      }),

      // 3. Open support tickets (live workload)
      prisma.ticket.count({
        where: {
          tenantId,
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      }).catch(() => 0),

      // 4. Active projects (live workload)
      prisma.project.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }).catch(() => []),

      // 5. Open CRM leads (live workload)
      prisma.crmLead.count({
        where: {
          tenantId,
          status: { in: ['NEW', 'CONTACTED', 'QUALIFIED'] }
        }
      }).catch(() => 0),
    ]);

    // ─── Build Segment Maps ───

    // Profit centers: module → { revenue, cogs, opex }
    const profitMap = new Map<string, { revenue: number; cogs: number; opex: number }>();

    // Cost centers: category → total expense amount
    const costMap = new Map<string, number>();

    // Initialize profit centers for enabled modules only
    for (const id of enabledModuleIds) {
      if (PROFIT_CENTER_IDS.has(id)) {
        profitMap.set(id, { revenue: 0, cogs: 0, opex: 0 });
      }
    }

    // Initialize cost centers for enabled modules only
    for (const id of enabledModuleIds) {
      if (COST_CENTER_IDS.has(id)) {
        costMap.set(id, 0);
      }
    }

    // ─── Process Invoice Lines → Revenue & COGS ───
    // Invoice lines are attributed to profit centers based on product category.
    // If product.category matches a profit center label, it goes there.
    // Otherwise, it's bucketed into a generic "Other" profit center.
    invoiceLines.forEach(line => {
      const productCategory = line.product?.category || '';

      // Try to match the product category to a profit center module name
      let matchedModuleId = 'sales'; // Default: unmatched revenue → Sales
      for (const [id, label] of Object.entries(MODULE_LABELS)) {
        if (PROFIT_CENTER_IDS.has(id) && productCategory.toLowerCase().includes(label.toLowerCase())) {
          matchedModuleId = id;
          break;
        }
      }

      // If matched module is not enabled, bucket to "sales" or "Other"
      if (!profitMap.has(matchedModuleId)) {
        matchedModuleId = profitMap.has('sales') ? 'sales' : '__other__';
        if (matchedModuleId === '__other__' && !profitMap.has('__other__')) {
          profitMap.set('__other__', { revenue: 0, cogs: 0, opex: 0 });
        }
      }

      const current = profitMap.get(matchedModuleId) || { revenue: 0, cogs: 0, opex: 0 };
      const lineRevenue = line.quantity * line.unitPrice;
      const lineCOGS = line.product ? (line.quantity * (line.product.costPrice || 0)) : 0;

      profitMap.set(matchedModuleId, {
        revenue: current.revenue + lineRevenue,
        cogs: current.cogs + lineCOGS,
        opex: current.opex,
      });
    });

    // ─── Process Expenses ───
    // Attribute expenses to cost centers based on expense.category field.
    // If expense category matches a cost center name, it goes there.
    // Otherwise, attribute to a general "Operations" bucket.
    expenses.forEach(exp => {
      const expenseCategory = exp.category || '';
      let matched = false;

      for (const [id, label] of Object.entries(MODULE_LABELS)) {
        if (COST_CENTER_IDS.has(id) && expenseCategory.toLowerCase().includes(label.toLowerCase())) {
          costMap.set(id, (costMap.get(id) || 0) + exp.amount);
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Check if it could be attributed to a profit center's opex
        let profitMatched = false;
        for (const [id, label] of Object.entries(MODULE_LABELS)) {
          if (PROFIT_CENTER_IDS.has(id) && profitMap.has(id) && expenseCategory.toLowerCase().includes(label.toLowerCase())) {
            const current = profitMap.get(id)!;
            profitMap.set(id, { ...current, opex: current.opex + exp.amount });
            profitMatched = true;
            break;
          }
        }

        if (!profitMatched) {
          // General operations expense
          costMap.set('operations', (costMap.get('operations') || 0) + exp.amount);
        }
      }
    });

    // ─── Build Response Arrays ───

    // Profit center segments (for P&L card)
    const segments = Array.from(profitMap.entries())
      .map(([id, data]) => {
        const totalCost = data.cogs + data.opex;
        const grossProfit = data.revenue - totalCost;
        const margin = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0;

        return {
          module: id === '__other__' ? 'Other' : (MODULE_LABELS[id] || id),
          moduleId: id,
          revenue: data.revenue,
          cogs: data.cogs,
          opex: data.opex,
          grossProfit,
          margin,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Cost center breakdown (for Cost Centers card)
    const costCenters = Array.from(costMap.entries())
      .map(([id, amount]) => ({
        department: MODULE_LABELS[id] || (id === 'operations' ? 'General Operations' : id),
        departmentId: id,
        totalExpense: amount,
      }))
      .sort((a, b) => b.totalExpense - a.totalExpense);

    // Grand totals
    const grandTotalRevenue = segments.reduce((acc, s) => acc + s.revenue, 0);
    const grandTotalCOGS = segments.reduce((acc, s) => acc + s.cogs, 0);
    const grandTotalOpex = segments.reduce((acc, s) => acc + s.opex, 0);
    const totalCostCenterExpense = costCenters.reduce((acc, c) => acc + c.totalExpense, 0);
    const grandTotalProfit = grandTotalRevenue - (grandTotalCOGS + grandTotalOpex + totalCostCenterExpense);
    const grandTotalMargin = grandTotalRevenue > 0 ? (grandTotalProfit / grandTotalRevenue) * 100 : 0;

    // Operations pulse data (for Active Workload card)
    const projectStatusArr = Array.isArray(projectStats) ? projectStats : [];
    const activeProjects = projectStatusArr
      .filter((p: { status: string }) => ['IN_PROGRESS', 'ACTIVE'].includes(p.status))
      .reduce((acc: number, p: { _count: { id: number } }) => acc + p._count.id, 0);
    const totalProjects = projectStatusArr
      .reduce((acc: number, p: { _count: { id: number } }) => acc + p._count.id, 0);

    return NextResponse.json({
      period,
      overview: {
        revenue: grandTotalRevenue,
        cogs: grandTotalCOGS,
        opex: grandTotalOpex,
        profit: grandTotalProfit,
        margin: grandTotalMargin,
      },
      segments,
      costCenters,
      totalCostCenterExpense,
      operations: {
        openTickets: ticketCount,
        activeProjects,
        totalProjects,
        openLeads: leadCount,
      },
    });

  } catch (error) {
    console.error('Financial API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
