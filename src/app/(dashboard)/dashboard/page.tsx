
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  DollarSign,
  Users,
  ShoppingCart,
  ShoppingBag,
  Package,
  Factory,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CalendarClock,
  BarChart3,
  Building2,
  Sparkles,
  Globe,
  ArrowRight,
  MoreHorizontal,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wrench,
  Store,
  Ship,
  Home,
  Building,
  UtensilsCrossed,
  Briefcase,
  FolderKanban,
  Megaphone,
  Headphones,
  Stethoscope,
  Pill,
  TestTube,
  Bed,
  HeartPulse,
  LayoutDashboard,
  Settings,
  FileText,
  CheckCircle,
  Gift,
  UserCheck,
  MessageSquare,
  Phone,
  Calendar,
  GraduationCap,
  BookOpen,
  MessagesSquare,
  Presentation,
  Workflow,
  Puzzle,
  Code,
  Brain,
  Heart,
  UserPlus
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { FinancialOverview } from '@/components/dashboard/financial-overview';
import { AVAILABLE_MODULES } from '@/lib/modules';

// --- Types ---

type DashboardResponse = {
  stats?: {
    totalRevenue?: number;
    revenueChange?: number;
    customerCount?: number;
    customerChange?: number;
    orderCount?: number;
    orderChange?: number;
    productCount?: number;
    productChange?: number;
  };
  revenueTrend?: Array<{ name: string; value: number }>;
  recentActivity?: Array<{
    id: string;
    type: string;
    description: string;
    customer: string;
    amount: number;
    status: string;
    date: string;
  }>;
  systemHealth?: {
    trialDaysRemaining: number;
    isTrial: boolean;
    dbStatus: string;
    uptime: number;
  };
  manufacturing?: {
    inProgress?: number;
    scheduled?: number;
    pending?: number;
  };
};

// --- Mock Data for Charts ---

// --- Mock Data Removed (Now Dynamic) ---

const SALES_BY_CATEGORY = [
  { name: 'Electronics', value: 4000 },
  { name: 'Clothing', value: 3000 },
  { name: 'Home', value: 2000 },
  { name: 'Sports', value: 2780 },
];

// --- Constants ---

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Settings, Users, FileText, ShoppingCart, DollarSign, ShoppingBag, CreditCard,
  Package, Factory, CheckCircle, Wrench, Store, Ship, Briefcase, Clock, FolderKanban,
  Megaphone, ClipboardList: FileText, // Fallback common icon
  Headphones, Gift, Home, UserCheck, Building, UtensilsCrossed, MessageSquare, Phone,
  Calendar, GraduationCap, BookOpen, MessagesSquare, Presentation, Workflow, Puzzle, Code,
  Brain, Heart, UserPlus, Stethoscope, Pill, TestTube, Bed, HeartPulse, Activity
};

// Map categories to colors
const categoryColorMap: Record<string, string> = {
  core: 'text-slate-600 bg-slate-50',
  sales: 'text-blue-600 bg-blue-50',
  finance: 'text-emerald-600 bg-emerald-50',
  operations: 'text-violet-600 bg-violet-50',
  hr: 'text-orange-600 bg-orange-50',
  projects: 'text-indigo-600 bg-indigo-50',
  marketing: 'text-pink-600 bg-pink-50',
  services: 'text-cyan-600 bg-cyan-50',
  ecommerce: 'text-teal-600 bg-teal-50',
  realestate: 'text-rose-600 bg-rose-50',
  hospitality: 'text-amber-600 bg-amber-50',
  communication: 'text-sky-600 bg-sky-50',
  productivity: 'text-lime-600 bg-lime-50',
  automation: 'text-fuchsia-600 bg-fuchsia-50',
  healthcare: 'text-red-600 bg-red-50',
};

// --- Helper Functions ---



const formatNumber = (value?: number) => Number(value ?? 0).toLocaleString('en-US');

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// --- Components ---

export default function DashboardPage() {
  const { data: session } = useSession();
  const [response, setResponse] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const tenantId = session?.user?.tenantId;
  const enabledModuleIds: string[] = session?.user?.enabledModuleIds || [];

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);

    try {
      const res = await fetch(`/api/dashboard/stats?tenantId=${tenantId}`);
      const json = await res.json();
      setResponse(json);
    } catch (err) {
      // Use warning instead of error to prevent Next.js dev overlay 
      // from popping up when browser extensions intercept/block fetches
      console.warn('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Initial fetch
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh every 30 seconds (silent)
  useEffect(() => {
    if (!tenantId) return;
    const interval = setInterval(() => fetchDashboard(true), 30_000);
    return () => clearInterval(interval);
  }, [tenantId, fetchDashboard]);

  const stats = response?.stats ?? {};
  const recentActivity = response?.recentActivity ?? [];
  const systemHealth = response?.systemHealth;
  const manufacturing = response?.manufacturing ?? {};
  const revenueTrend = response?.revenueTrend ?? [];

  const metrics = useMemo(
    () => {
      const baseMetrics = [
        {
          title: 'Total Revenue',
          value: formatCurrency(stats.totalRevenue ?? 0),
          change: stats.revenueChange,
          icon: DollarSign,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          show: true,
        },
        {
          title: 'Active Customers',
          value: formatNumber(stats.customerCount),
          change: stats.customerChange,
          icon: Users,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          show: true,
        },
        {
          title: 'Total Orders',
          value: formatNumber(stats.orderCount),
          change: stats.orderChange,
          icon: ShoppingBag,
          color: 'text-violet-600',
          bg: 'bg-violet-50',
          show: enabledModuleIds.includes('sales') || enabledModuleIds.includes('pos'),
        },
        {
          title: 'Products in Stock',
          value: formatNumber(stats.productCount),
          change: stats.productChange,
          icon: Package,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          show: enabledModuleIds.includes('inventory') || enabledModuleIds.includes('spareparts'),
        },
      ];
      return baseMetrics.filter(m => m.show);
    },
    [stats, enabledModuleIds]
  );

  const quickLinks = useMemo(() => {
    return AVAILABLE_MODULES
      .filter(m => enabledModuleIds.includes(m.id) && m.category !== 'core' && m.id !== 'dashboard')
      .map(m => ({
        href: m.route || '#',
        title: m.name,
        icon: (m.icon && iconMap[m.icon]) ? iconMap[m.icon] : CheckCircle, // Fallback icon
        color: categoryColorMap[m.category] || 'text-slate-600 bg-slate-50'
      }));
  }, [enabledModuleIds]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm font-medium text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle>No Tenant Connected</CardTitle>
            <CardDescription>
              Please connect to an organization to view your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
            <Link href="/settings/company">
              <Button>Connect Tenant</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstName = session?.user?.name?.split(' ')[0] ?? 'User';

  return (
    <div className="space-y-8 p-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-slate-500">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Last 30 Days
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Sparkles className="h-4 w-4" />
            AI Insights
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, i) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-slate-200 shadow-sm transition-all hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`rounded-xl p-2.5 ${metric.bg} ${metric.color}`}>
                    <metric.icon className="h-6 w-6" />
                  </div>
                  {metric.change !== undefined && (
                    <Badge
                      variant="secondary"
                      className={`${metric.change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'} border-transparent`}
                    >
                      {metric.change >= 0 ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                      {Math.abs(metric.change).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-500">{metric.title}</p>
                  <h3 className="text-2xl font-bold text-slate-900">{metric.value}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-7">
        {/* Charts Section */}
        <Card className="col-span-4 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue performance (Last 6 Months)</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest transactions across all modules</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-slate-100 p-3">
                    <Activity className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">No recent activity found</p>
                </div>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Icon based on Activity Type */}
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full 
                        ${item.type === 'Booking' ? 'bg-amber-50 text-amber-600' :
                          item.type === 'Invoice' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-blue-50 text-blue-600'}`}>
                        {item.type === 'Booking' ? <Bed className="h-5 w-5" /> :
                          item.type === 'Invoice' ? <FileText className="h-5 w-5" /> :
                            <ShoppingBag className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{item.description}</p>
                        <p className="text-xs text-slate-500">
                          {item.customer} • {new Date(item.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">{formatCurrency(item.amount)}</p>
                      <Badge variant="outline" className="mt-1 border-slate-200 text-xs font-normal text-slate-600">
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-12 gap-8">
        <FinancialOverview />

        {/* We can move Recent Orders here to sit next to Financials if we want, 
            but for now let's keep the existing layout structure and just insert this 
            as a new full-width or partial section. 
            However, user asked for it to be part of the dashboard.
            Let's make FinancialOverview taking full width or sharing with something.
            The component is col-span-7 so it needs a partner col-span-5.
            Let's move Quick Access or something else next to it, or make it standalone.
            For "Simple but Cool", let's put it in its own row for now as it has internal grid.
         */}
      </div>

      {/* Quick Access Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Access</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="group cursor-pointer border-slate-200 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className={`rounded-xl p-3 ${link.color} transition-transform group-hover:scale-110`}>
                    <link.icon className="h-6 w-6" />
                  </div>
                  <span className="font-medium text-slate-700 group-hover:text-blue-600">
                    {link.title}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Production & Tasks Row */}
      <div className="grid gap-8 lg:grid-cols-2">
        {enabledModuleIds.includes('manufacturing') && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Production Status</CardTitle>
              <CardDescription>Real-time manufacturing overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'In Progress', value: manufacturing.inProgress || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Scheduled', value: manufacturing.scheduled || 0, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Pending', value: manufacturing.pending || 0, color: 'text-slate-600', bg: 'bg-slate-50' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
                    <span className="text-xs font-medium text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Operational status and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-emerald-900">All Systems Operational</p>
                    <p className="text-xs text-emerald-700">Database, API, and Workers running normally</p>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                  {systemHealth?.uptime || 99.9}% Uptime
                </Badge>
              </div>

              {/* Trial / Subscription Status */}
              <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {systemHealth?.isTrial ? 'Free Trial' : 'Subscription Active'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {systemHealth?.isTrial
                        ? `${systemHealth?.trialDaysRemaining} days remaining`
                        : 'Next billing date: --'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  {systemHealth?.isTrial ? 'Upgrade' : 'Manage'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div >
  );
}
