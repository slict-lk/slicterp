"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModuleCopilotPanel } from '@/components/ai/module-copilot-panel';
import {
    Store,
    Users,
    ShoppingCart,
    Package,
    TrendingUp,
    AlertTriangle,
    RefreshCw,
    Plus,
    ArrowRight,
    DollarSign,
    Percent,
    Truck
} from 'lucide-react';

interface DashboardStats {
    todaySales: { total: number; count: number; avgTicket: number };
    monthSales: { total: number; count: number };
    lowStockCount: number;
    pendingReorders: number;
    activeCustomers: number;
    activePromotions: number;
}

interface RecentTransaction {
    id: string;
    invoiceNumber: string;
    total: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    customer: { name: string } | null;
    _count: { items: number };
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}

export default function SparePartsPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setRefreshing(true);
            const [statsRes, transactionsRes] = await Promise.all([
                fetch('/api/spareparts/dashboard/stats'),
                fetch('/api/spareparts/sales?limit=5'),
            ]);

            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }
            if (transactionsRes.ok) {
                const data = await transactionsRes.json();
                setRecentTransactions(data.invoices || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
                        <Store className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        Spare Parts Shop
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                        Complete retail management - customers, sales, inventory, and promotions
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={fetchData} disabled={refreshing} className="w-full sm:w-auto">
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Link href="/spareparts/pos" className="w-full sm:w-auto">
                        <Button className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            New Sale
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Today's Sales"
                    value={stats ? formatCurrency(stats.todaySales.total) : '---'}
                    subtitle={stats ? `${stats.todaySales.count} transactions` : 'Loading...'}
                    icon={DollarSign}
                    variant="green"
                />
                <StatCard
                    title="Month Sales"
                    value={stats ? formatCurrency(stats.monthSales.total) : '---'}
                    subtitle={stats ? `${stats.monthSales.count} transactions` : 'Loading...'}
                    icon={TrendingUp}
                    variant="blue"
                />
                <StatCard
                    title="Low Stock Items"
                    value={stats?.lowStockCount?.toString() || '0'}
                    subtitle="Need attention"
                    icon={AlertTriangle}
                    variant="orange"
                />
                <StatCard
                    title="Active Promotions"
                    value={stats?.activePromotions?.toString() || '0'}
                    subtitle="Running now"
                    icon={Percent}
                    variant="purple"
                />
            </div>

            <ModuleCopilotPanel
                module="spareparts"
                title="Spare Parts Copilot"
                description="Highlight low-stock exposure, reorder pressure, and sales momentum."
                context={{
                    todaySales: stats?.todaySales.total || 0,
                    monthSales: stats?.monthSales.total || 0,
                    lowStockCount: stats?.lowStockCount || 0,
                    pendingReorders: stats?.pendingReorders || 0,
                    activeCustomers: stats?.activeCustomers || 0,
                    recentTransactions: recentTransactions.length,
                }}
                suggestions={[
                    'Which stock issues need action first?',
                    'Summarize reorder priorities by urgency.',
                ]}
            />

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                <QuickAction href="/spareparts/pos" icon={ShoppingCart} label="Point of Sale" color="bg-green-500" />
                <QuickAction href="/spareparts/customers" icon={Users} label="Customers" color="bg-blue-500" />
                <QuickAction href="/spareparts/sales" icon={DollarSign} label="Sales & Invoices" color="bg-purple-500" />
                <QuickAction href="/spareparts/inventory" icon={Package} label="Inventory" color="bg-orange-500" />
                <QuickAction href="/spareparts/promotions" icon={Percent} label="Promotions" color="bg-pink-500" />
                <QuickAction href="/spareparts/purchases" icon={Truck} label="Purchases" color="bg-teal-500" />
            </div>

            {/* Recent Transactions & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Transactions */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Transactions</CardTitle>
                            <CardDescription>Latest sales activity</CardDescription>
                        </div>
                        <Link href="/spareparts/sales">
                            <Button variant="ghost" size="sm">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-8 text-gray-500">
                                Loading...
                            </div>
                        ) : recentTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                                <ShoppingCart className="h-12 w-12 mb-2 opacity-50" />
                                <p>No transactions yet</p>
                                <Link href="/spareparts/pos" className="mt-2">
                                    <Button size="sm">Create First Sale</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentTransactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {tx.invoiceNumber}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {tx.customer?.name || 'Walk-in'} • {tx._count.items} items
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(tx.total)}
                                            </p>
                                            <Badge
                                                variant={tx.paymentStatus === 'PAID' ? 'default' : 'secondary'}
                                            >
                                                {tx.paymentStatus}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Alerts & Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle>Alerts & Notifications</CardTitle>
                        <CardDescription>Items requiring attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats && stats.lowStockCount > 0 && (
                                <AlertItem
                                    type="warning"
                                    title="Low Stock Alert"
                                    description={`${stats.lowStockCount} products are running low on stock`}
                                    action={{ label: 'View', href: '/spareparts/inventory?filter=low-stock' }}
                                />
                            )}
                            {stats && stats.pendingReorders > 0 && (
                                <AlertItem
                                    type="info"
                                    title="Pending Reorders"
                                    description={`${stats.pendingReorders} reorder suggestions waiting for approval`}
                                    action={{ label: 'Review', href: '/spareparts/reorder' }}
                                />
                            )}
                            {(!stats || (stats.lowStockCount === 0 && stats.pendingReorders === 0)) && (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                                    <Package className="h-12 w-12 mb-2 opacity-50" />
                                    <p>No alerts at this time</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    variant,
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: typeof Users;
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
                    <p className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
                </div>
                <div className={`rounded-xl p-2 sm:p-3 flex-shrink-0 ${colors[variant]}`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
            </CardContent>
        </Card>
    );
}

function QuickAction({
    href,
    icon: Icon,
    label,
    color,
}: {
    href: string;
    icon: typeof Users;
    label: string;
    color: string;
}) {
    return (
        <Link href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
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

function AlertItem({
    type,
    title,
    description,
    action,
}: {
    type: 'warning' | 'info' | 'error';
    title: string;
    description: string;
    action?: { label: string; href: string };
}) {
    const colors = {
        warning: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400 border-orange-200',
        info: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 border-blue-200',
        error: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 border-red-200',
    };

    return (
        <div className={`flex items-center justify-between p-4 rounded-lg border ${colors[type]}`}>
            <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5" />
                <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm opacity-80">{description}</p>
                </div>
            </div>
            {action && (
                <Link href={action.href}>
                    <Button variant="ghost" size="sm">
                        {action.label}
                    </Button>
                </Link>
            )}
        </div>
    );
}
