'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, ShoppingBag, Car, MapPin, Coffee, Users, Target, ArrowUpRight, ArrowDownRight, Filter, DownloadCloud, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

type ModuleSummary = {
    module: string;
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
    transactions: number;
};

const MODULE_COLORS: Record<string, string> = {
    'hotel': '#10b981',        // Emerald
    'vehicle-export': '#f59e0b', // Amber
    'spareparts': '#3b82f6',     // Blue
    'properties': '#8b5cf6',     // Violet
    'restaurant': '#ef4444',     // Red
    'pos': '#06b6d4',          // Cyan
    'sales': '#ec4899',          // Pink
    'hr': '#64748b'            // Slate
};

const MODULE_ICONS: Record<string, any> = {
    'hotel': Building2,
    'vehicle-export': Car,
    'spareparts': Target,
    'properties': MapPin,
    'restaurant': Coffee,
    'pos': ShoppingBag,
    'sales': ShoppingBag,
    'hr': Users
};

const ANIMATION = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
};

export default function ModuleReportsPage() {
    const [period, setPeriod] = useState('this-month');
    const [summaries, setSummaries] = useState<ModuleSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch basic overview data from the module-summary endpoint
                const res = await fetch(`/api/accounting/reports/module-summary?period=${period}`);
                if (res.ok) {
                    const data = await res.json();

                    // Transform to local type and enrich
                    const parsed = (data.moduleSummaries || []).map((m: any) => {
                        const rev = m.revenue || 0;
                        const exp = m.expenses || 0;
                        const prof = rev - exp;
                        return {
                            module: m.module,
                            revenue: rev,
                            expenses: exp,
                            profit: prof,
                            margin: rev > 0 ? (prof / rev) * 100 : 0,
                            transactions: m.transactionCount || 0
                        };
                    });

                    setSummaries(parsed.sort((a: any, b: any) => b.revenue - a.revenue));
                }
            } catch (error) {
                console.error('Failed to fetch module summaries', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [period]);

    const totalRevenue = summaries.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalExpenses = summaries.reduce((acc, curr) => acc + curr.expenses, 0);
    const totalProfit = totalRevenue - totalExpenses;
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-100">
                    <p className="font-bold text-slate-800 capitalize mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={`item-${index}`} className="text-sm font-medium flex items-center justify-between gap-4">
                            <span style={{ color: entry.color }}>{entry.name}</span>
                            <span className="text-slate-900">Rs. {entry.value.toLocaleString()}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <motion.div {...ANIMATION}>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-blue-600" />
                        Module Analytics
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg font-medium">Cross-module financial intelligence and margin comparison</p>
                </motion.div>
                <motion.div {...ANIMATION} transition={{ delay: 0.1 }} className="flex items-center gap-3">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[180px] bg-white border-slate-200 font-medium">
                            <Filter className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="this-week">This Week</SelectItem>
                            <SelectItem value="this-month">This Month</SelectItem>
                            <SelectItem value="this-quarter">This Quarter</SelectItem>
                            <SelectItem value="this-year">This Year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="bg-white" disabled>
                        <DownloadCloud className="w-4 h-4 mr-2" /> Export (coming soon)
                    </Button>
                </motion.div>
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { title: 'Total Revenue', value: totalRevenue, prefix: 'Rs. ' },
                    { title: 'Total Expenses', value: totalExpenses, prefix: 'Rs. ' },
                    { title: 'Net Profit', value: totalProfit, prefix: 'Rs. ', highlight: true },
                    { title: 'Blended Margin', value: overallMargin, suffix: '%', isPercentage: true }
                ].map((kpi, i) => (
                    <motion.div key={i} {...ANIMATION} transition={{ delay: i * 0.1 }}>
                        <Card className={cn(
                            "overflow-hidden relative group transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                            kpi.highlight ? "bg-slate-900 text-white border-slate-800" : "bg-white border-slate-100"
                        )}>
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity",
                                kpi.highlight ? "from-blue-400 to-emerald-400" : "from-slate-100 to-slate-50"
                            )} />
                            <CardHeader className="pb-2">
                                <CardDescription className={kpi.highlight ? "text-slate-400" : "text-slate-500 font-medium"}>
                                    {kpi.title}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black tracking-tighter">
                                        {kpi.prefix}{kpi.isPercentage ? kpi.value.toFixed(1) : kpi.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}{kpi.suffix}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue vs Expenses */}
                <motion.div {...ANIMATION} transition={{ delay: 0.3 }} className="lg:col-span-2">
                    <Card className="h-full border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-slate-800">Revenue & Expenses by Module</CardTitle>
                            <CardDescription>Comparative financial performance across all active modules</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px] mt-4">
                                {loading ? (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 animate-pulse">Loading visualization...</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={summaries} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={8}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="module"
                                                tickFormatter={(v) => v.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontWeight: 500 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}k`}
                                                tick={{ fill: '#64748b' }}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Revenue Distribution */}
                <motion.div {...ANIMATION} transition={{ delay: 0.4 }}>
                    <Card className="h-full border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-slate-800">Revenue Distribution</CardTitle>
                            <CardDescription>Composition of total revenue stream</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center">
                            <div className="h-[300px] w-full">
                                {loading ? null : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={summaries.filter(s => s.revenue > 0)}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={120}
                                                paddingAngle={5}
                                                dataKey="revenue"
                                                nameKey="module"
                                                stroke="none"
                                            >
                                                {summaries.filter(s => s.revenue > 0).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={MODULE_COLORS[entry.module] || '#cbd5e1'} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => `Rs. ${value.toLocaleString()}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <div className="w-full mt-4 space-y-3">
                                {summaries.filter(s => s.revenue > 0).slice(0, 4).map(s => {
                                    const percentage = totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0;
                                    const Icon = MODULE_ICONS[s.module] || ShoppingBag;
                                    return (
                                        <div key={s.module} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MODULE_COLORS[s.module] || '#cbd5e1' }} />
                                                <span className="capitalize font-medium text-slate-700 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{s.module.replace('-', ' ')}</span>
                                            </div>
                                            <span className="font-bold text-slate-900">{percentage.toFixed(1)}%</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Detailed Module Breakdown */}
            <motion.div {...ANIMATION} transition={{ delay: 0.5 }}>
                <Card className="border-slate-100 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-slate-800">Module Performance Matrix</CardTitle>
                        <CardDescription>Detailed statistical breakdown by operational sector</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {summaries.map(module => {
                                const Icon = MODULE_ICONS[module.module] || ShoppingBag;
                                const isProfitable = module.profit >= 0;
                                return (
                                    <div key={module.module} className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-blue-100 hover:shadow-lg transition-all group">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-bold text-slate-800 capitalize">{module.module.replace('-', ' ')}</h3>
                                            </div>
                                            <Badge variant={isProfitable ? "secondary" : "destructive"} className={isProfitable ? "bg-emerald-50 text-emerald-700" : ""}>
                                                {isProfitable ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                                {Math.abs(module.margin).toFixed(1)}%
                                            </Badge>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 font-medium">Revenue</span>
                                                <span className="font-bold text-slate-900">Rs. {module.revenue.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 font-medium">Expenses</span>
                                                <span className="font-bold text-slate-900">Rs. {module.expenses.toLocaleString()}</span>
                                            </div>
                                            <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center">
                                                <span className="text-slate-500 font-medium text-sm">Net Profit</span>
                                                <span className={cn("font-black text-lg", isProfitable ? "text-emerald-600" : "text-rose-600")}>
                                                    Rs. {module.profit.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        {summaries.length === 0 && !loading && (
                            <div className="text-center py-12 text-slate-500">
                                No module data available for this period.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
