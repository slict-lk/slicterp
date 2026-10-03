"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Receipt,
  CreditCard,
  RefreshCw,
  Plus,
  ArrowRight,
  BookOpen,
  Landmark,
  FileText,
  ArrowRightLeft,
  BarChart3,
  Clock,
  Settings,
  Wrench,
  Car,
  Building,
  UtensilsCrossed,
  ShoppingBag,
  Package,
  Users,
  Home,
  Heart,
  Layers,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModuleCopilotPanel } from "@/components/ai/module-copilot-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, formatDistanceToNow } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// NoSSR wrapper for Recharts
function NoSSR({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-[300px] w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />;
  return <>{children}</>;
}

// ─── Module Configuration ─────────────────────────────────────

interface ModuleConfig {
  slug: string;
  label: string;
  icon: any;
  color: string;
  chartColor: string;
}

const MODULE_CONFIGS: ModuleConfig[] = [
  { slug: "spareparts", label: "Spareparts", icon: Wrench, color: "bg-amber-500", chartColor: "#F59E0B" },
  { slug: "vehicle-export", label: "Vehicle Export", icon: Car, color: "bg-violet-500", chartColor: "#8B5CF6" },
  { slug: "hotel", label: "Hotel", icon: Building, color: "bg-cyan-500", chartColor: "#06B6D4" },
  { slug: "restaurant", label: "Restaurant", icon: UtensilsCrossed, color: "bg-pink-500", chartColor: "#EC4899" },
  { slug: "pos", label: "POS", icon: CreditCard, color: "bg-teal-500", chartColor: "#14B8A6" },
  { slug: "sales", label: "Sales", icon: ShoppingBag, color: "bg-blue-500", chartColor: "#2563EB" },
  { slug: "purchasing", label: "Purchasing", icon: Package, color: "bg-amber-600", chartColor: "#D97706" },
  { slug: "hr", label: "HR", icon: Users, color: "bg-emerald-500", chartColor: "#059669" },
  { slug: "properties", label: "Properties", icon: Home, color: "bg-purple-500", chartColor: "#7C3AED" },
  { slug: "healthcare", label: "Healthcare", icon: Heart, color: "bg-red-500", chartColor: "#EF4444" },
];

// ─── Types ────────────────────────────────────────────────────

interface ModuleSummary {
  slug: string;
  revenue: number;
  expenses: number;
  receivables: number;
  payables: number;
  transactionCount: number;
}

interface GLEntry {
  id: string;
  reference: string;
  description: string;
  sourceModule: string | null;
  sourceDocumentType: string | null;
  sourceDocumentId: string | null;
  date: string;
  createdAt: string;
  totalAmount: number;
}

interface ModuleSummaryResponse {
  modules: ModuleSummary[];
  consolidated: {
    totalRevenue: number;
    totalExpenses: number;
    totalReceivables: number;
    totalPayables: number;
    netProfit: number;
    totalTransactions: number;
  };
  monthlyData: Array<Record<string, any>>;
  recentGLEntries: GLEntry[];
  enabledModules: string[];
  baseCurrency: string;
}

interface Invoice {
  id: string;
  number: string;
  type: string;
  status: string;
  total: number;
  amountDue: number;
  currencyCode?: string;
  issueDate: string;
  dueDate: string;
  customer?: { name: string };
  vendor?: { name: string };
}

interface Payment {
  id: string;
  amount: number;
  status?: string;
  method: string;
  currencyCode?: string;
  paymentDate: string;
  reference?: string;
  invoice?: {
    number: string;
    customer?: { name: string };
    vendor?: { name: string };
  };
}

// ─── Components ───────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    OPEN: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300/30",
    PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300/30",
    OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300/30",
    DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-300/30",
    CLEARED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300/30",
    RECONCILED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-300/30",
    CREDIT_NOTE: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300/30",
  };

  return (
    <Badge variant="outline" className={`${styles[status] || styles.DRAFT} text-[10px] font-semibold tracking-wider uppercase`}>
      {status.replaceAll('_', ' ')}
    </Badge>
  );
};

function StatCard({ title, value, subtitle, icon: Icon, variant }: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  variant: 'green' | 'blue' | 'orange' | 'purple';
}) {
  const colors = {
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4 sm:p-6">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate tabular-nums">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        <div className={`rounded-xl p-2 sm:p-3 flex-shrink-0 ${colors[variant]}`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ href, icon: Icon, label, color }: {
  href: string;
  icon: any;
  label: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer">
        <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4 text-center min-h-[100px] sm:min-h-[120px]">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${color} flex items-center justify-center mb-2`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

function ModuleBadge({ moduleSlug }: { moduleSlug: string | null }) {
  if (!moduleSlug) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        <BookOpen className="h-3 w-3" />
        Manual
      </span>
    );
  }
  const config = MODULE_CONFIGS.find(m => m.slug === moduleSlug);
  if (!config) return null;
  const IconComp = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
      style={{ backgroundColor: config.chartColor }}
    >
      <IconComp className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────

export default function AccountingDashboard() {
  const [activeModule, setActiveModule] = useState<string>("all");
  const [moduleSummary, setModuleSummary] = useState<ModuleSummaryResponse | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeDate = (dateString: string) => {
    if (!dateString) return null;
    const d = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  };

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const [invRes, payRes, summaryRes] = await Promise.all([
        fetch('/api/accounting/invoices?limit=10'),
        fetch('/api/accounting/payments?limit=10'),
        fetch('/api/accounting/reports/module-summary'),
      ]);
      let errorMessages = [];
      if (invRes.ok) {
        setInvoices(await invRes.json());
      } else {
        errorMessages.push(`Invoices (${invRes.status})`);
        console.error('Invoice fetch error:', await invRes.text());
      }

      if (payRes.ok) {
        setPayments(await payRes.json());
      } else {
        errorMessages.push(`Payments (${payRes.status})`);
        console.error('Payments fetch error:', await payRes.text());
      }

      if (summaryRes.ok) {
        setModuleSummary(await summaryRes.json());
      } else {
        errorMessages.push(`Summary (${summaryRes.status})`);
        console.error('Summary fetch error:', await summaryRes.text());
      }

      if (errorMessages.length > 0) {
        setError(`Failed to load: ${errorMessages.join(', ')}`);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter modules based on tenant's enabled modules
  const enabledModuleConfigs = MODULE_CONFIGS.filter(
    m => moduleSummary?.enabledModules?.includes(m.slug)
  );

  // Get summary data for selected module or all
  const getFilteredStats = () => {
    if (!moduleSummary) return { revenue: 0, expenses: 0, receivables: 0, netProfit: 0, transactions: 0 };

    if (activeModule === "all") {
      return {
        revenue: moduleSummary.consolidated.totalRevenue,
        expenses: moduleSummary.consolidated.totalExpenses,
        receivables: moduleSummary.consolidated.totalReceivables,
        netProfit: moduleSummary.consolidated.netProfit,
        transactions: moduleSummary.consolidated.totalTransactions,
      };
    }

    const mod = moduleSummary.modules.find(m => m.slug === activeModule);
    if (!mod) return { revenue: 0, expenses: 0, receivables: 0, netProfit: 0, transactions: 0 };
    return {
      revenue: mod.revenue,
      expenses: mod.expenses,
      receivables: mod.receivables,
      netProfit: mod.revenue - mod.expenses,
      transactions: mod.transactionCount,
    };
  };

  const stats = getFilteredStats();
  const baseCurrency = moduleSummary?.baseCurrency || 'LKR';

  // Filter GL entries by selected module
  const filteredGLEntries = moduleSummary?.recentGLEntries?.filter(
    e => activeModule === "all" || e.sourceModule === activeModule
  ) || [];

  // Derived metrics from invoices (kept for backward compat)
  const totalReceivables = invoices
    .filter(i => i.type === 'SALES' && ['OPEN', 'OVERDUE'].includes(i.status))
    .reduce((acc, i) => {
      const c = i.currencyCode || 'LKR';
      acc[c] = (acc[c] || 0) + Number(i.amountDue);
      return acc;
    }, {} as Record<string, number>);

  const totalPayables = invoices
    .filter(i => i.type === 'PURCHASE' && ['OPEN', 'OVERDUE'].includes(i.status))
    .reduce((acc, i) => {
      const c = i.currencyCode || 'LKR';
      acc[c] = (acc[c] || 0) + Number(i.amountDue);
      return acc;
    }, {} as Record<string, number>);

  const totalPaymentsGrouped = payments.reduce((acc, p) => {
    const c = p.currencyCode || 'LKR';
    acc[c] = (acc[c] || 0) + Number(p.amount);
    return acc;
  }, {} as Record<string, number>);

  const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length;

  const formatGroupedValues = (group: Record<string, number>) => {
    const entries = Object.entries(group);
    if (entries.length === 0) return formatCurrency(0, 'LKR');
    return entries.map(([c, v]) => formatCurrency(v, c)).join(' + ');
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3 tracking-tight">
            <span className="p-2 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 text-white">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            Accounting
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Unified financial overview across all modules
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={fetchData} disabled={refreshing} className="w-full sm:w-auto">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/accounting/journal-entries">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Module Tab Bar */}
      {enabledModuleConfigs.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 min-w-max pb-2">
            <Button
              variant={activeModule === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveModule("all")}
              className="transition-all duration-200"
            >
              <Layers className="mr-1.5 h-4 w-4" />
              All Modules
            </Button>
            {enabledModuleConfigs.map(mod => {
              const IconComp = mod.icon;
              return (
                <Button
                  key={mod.slug}
                  variant={activeModule === mod.slug ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveModule(mod.slug)}
                  className="transition-all duration-200"
                >
                  <IconComp className="mr-1.5 h-4 w-4" />
                  {mod.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {activeModule === "all" || !moduleSummary ? (
          <>
            <StatCard
              title="Total Receivables"
              value={formatGroupedValues(totalReceivables)}
              subtitle={`${invoices.filter(i => i.type === 'SALES' && i.status === 'OPEN').length} open invoices`}
              icon={TrendingUp}
              variant="green"
            />
            <StatCard
              title="Total Payables"
              value={formatGroupedValues(totalPayables)}
              subtitle={`${invoices.filter(i => i.type === 'PURCHASE' && i.status === 'OPEN').length} open bills`}
              icon={TrendingDown}
              variant="orange"
            />
            <StatCard
              title="Payments Received"
              value={formatGroupedValues(totalPaymentsGrouped)}
              subtitle={`${payments.length} transactions`}
              icon={Wallet}
              variant="blue"
            />
            <StatCard
              title="Overdue Items"
              value={overdueCount.toString()}
              subtitle="Need attention"
              icon={Clock}
              variant="purple"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Module Revenue"
              value={formatCurrency(stats.revenue, baseCurrency)}
              subtitle={`${stats.transactions} GL entries`}
              icon={TrendingUp}
              variant="green"
            />
            <StatCard
              title="Module Expenses"
              value={formatCurrency(stats.expenses, baseCurrency)}
              subtitle="Total costs"
              icon={TrendingDown}
              variant="orange"
            />
            <StatCard
              title="Net Profit"
              value={formatCurrency(stats.netProfit, baseCurrency)}
              subtitle={stats.revenue > 0 ? `${((stats.netProfit / stats.revenue) * 100).toFixed(1)}% margin` : 'N/A'}
              icon={Wallet}
              variant="blue"
            />
            <StatCard
              title="Receivables"
              value={formatCurrency(stats.receivables, baseCurrency)}
              subtitle="Outstanding"
              icon={Clock}
              variant="purple"
            />
          </>
        )}
      </div>

      <ModuleCopilotPanel
        module="accounting"
        title="Accounting Copilot"
        description="Review collections risk, module profitability, and close-process exceptions."
        context={{
          activeModule,
          revenue: stats.revenue,
          expenses: stats.expenses,
          receivables: stats.receivables,
          netProfit: stats.netProfit,
          overdueCount,
          invoiceCount: invoices.length,
          paymentCount: payments.length,
        }}
        suggestions={[
          'Explain today’s biggest accounting risks.',
          'Summarize collections pressure and recommended actions.',
        ]}
      />

      {/* Revenue Chart + Module Breakdown */}
      {moduleSummary && moduleSummary.modules.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stacked Revenue Area Chart (2/3 width) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Revenue by Module</CardTitle>
              <CardDescription>Last 6 months trend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <NoSSR>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={moduleSummary.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(val: string) => {
                          const [y, m] = val.split('-');
                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          return months[parseInt(m) - 1] || val;
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(val: number) => {
                          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                          if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
                          return val.toString();
                        }}
                      />
                      <Tooltip
                        formatter={(val: number, name: string) => [formatCurrency(val, baseCurrency), MODULE_CONFIGS.find(m => m.slug === name)?.label || name]}
                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Legend
                        formatter={(value: string) => MODULE_CONFIGS.find(m => m.slug === value)?.label || value}
                      />
                      {enabledModuleConfigs.map(mod => (
                        <Area
                          key={mod.slug}
                          type="monotone"
                          dataKey={mod.slug}
                          stackId="1"
                          stroke={mod.chartColor}
                          fill={mod.chartColor}
                          fillOpacity={0.6}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </NoSSR>
              </div>
            </CardContent>
          </Card>

          {/* Module Breakdown (1/3 width) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Module Breakdown</CardTitle>
              <CardDescription>Revenue by business unit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {moduleSummary.modules.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-400">
                  <Layers className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">No module data yet</p>
                  <p className="text-xs mt-1">Transactions will appear here when modules post to GL</p>
                </div>
              ) : (
                moduleSummary.modules.map(mod => {
                  const config = MODULE_CONFIGS.find(m => m.slug === mod.slug);
                  const IconComp = config?.icon || Layers;
                  const maxRevenue = Math.max(...moduleSummary.modules.map(m => m.revenue), 1);
                  const percentage = moduleSummary.consolidated.totalRevenue > 0
                    ? ((mod.revenue / moduleSummary.consolidated.totalRevenue) * 100).toFixed(0)
                    : '0';
                  return (
                    <button
                      key={mod.slug}
                      onClick={() => setActiveModule(mod.slug)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer ${activeModule === mod.slug
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md ${config?.color || 'bg-gray-500'} flex items-center justify-center`}>
                            <IconComp className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{config?.label || mod.slug}</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                          {formatCurrency(mod.revenue, baseCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${(mod.revenue / maxRevenue) * 100}%`,
                              backgroundColor: config?.chartColor || '#6B7280',
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums w-8 text-right">{percentage}%</span>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        <QuickAction href="/accounting/invoices" icon={Receipt} label="Invoices" color="bg-blue-500" />
        <QuickAction href="/accounting/payments" icon={CreditCard} label="Payments" color="bg-green-500" />
        <QuickAction href="/accounting/chart-of-accounts" icon={Landmark} label="Chart of Accounts" color="bg-indigo-500" />
        <QuickAction href="/accounting/journal-entries" icon={BookOpen} label="Journal Entries" color="bg-purple-500" />
        <QuickAction href="/accounting/bank-reconciliation" icon={ArrowRightLeft} label="Bank Rec" color="bg-teal-500" />
        <QuickAction href="/accounting/reports" icon={BarChart3} label="Reports" color="bg-orange-500" />
        <QuickAction href="/accounting/periods" icon={Settings} label="Periods" color="bg-gray-500" />
      </div>

      {/* Main Content: Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent GL Entries from Modules */}
        {filteredGLEntries.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Module GL Entries</CardTitle>
                <CardDescription>Auto-posted from module transactions</CardDescription>
              </div>
              <Link href="/accounting/journal-entries">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredGLEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <ModuleBadge moduleSlug={entry.sourceModule} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{entry.reference}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {entry.description} • {formatDistanceToNow(new Date(safeDate(entry.createdAt as string) ?? Date.now()), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm tabular-nums">
                        {formatCurrency(entry.totalAmount, baseCurrency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Invoices</CardTitle>
              <CardDescription>Latest billing activity</CardDescription>
            </div>
            <Link href="/accounting/invoices">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div>
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                      </div>
                    </div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Receipt className="h-12 w-12 mb-2 opacity-20" />
                <p>No recent invoices</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                        <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{inv.number}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {inv.type === 'SALES' ? inv.customer?.name : inv.vendor?.name} • {safeDate(inv.issueDate) ? format(safeDate(inv.issueDate)!, 'MMM dd') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm tabular-nums">{formatCurrency(inv.total, inv.currencyCode || 'LKR')}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Payments</CardTitle>
              <CardDescription>Latest payment activity</CardDescription>
            </div>
            <Link href="/accounting/payments">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div>
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                      </div>
                    </div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mb-2 opacity-20" />
                <p>No recent payments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.slice(0, 5).map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{pay.reference || pay.invoice?.number || 'Payment'}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {pay.method} • {(() => { const d = safeDate(pay.paymentDate); return d ? format(d, 'MMM dd') : '-'; })()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm tabular-nums">{formatCurrency(pay.amount, pay.currencyCode || 'LKR')}</p>
                      {pay.status && <StatusBadge status={pay.status} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
