'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
    TrendingUp,
    TrendingDown,
    Activity,
    RefreshCw,
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// ─── Types ───

interface SegmentData {
    module: string;
    moduleId: string;
    revenue: number;
    cogs: number;
    opex: number;
    grossProfit: number;
    margin: number;
}

interface CostCenterData {
    department: string;
    departmentId: string;
    totalExpense: number;
}

interface OperationsData {
    openTickets: number;
    activeProjects: number;
    totalProjects: number;
    openLeads: number;
}

interface FinancialData {
    overview: {
        revenue: number;
        cogs: number;
        opex: number;
        profit: number;
        margin: number;
    };
    segments: SegmentData[];
    costCenters: CostCenterData[];
    totalCostCenterExpense: number;
    operations: OperationsData;
}

// ─── Auto-refresh interval (30 seconds) ───
const REFRESH_INTERVAL = 30_000;

// ─── Color palette for segments ───
const SEGMENT_COLORS = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-pink-500', 'bg-orange-500', 'bg-sky-500', 'bg-lime-500',
];

const COST_COLORS = [
    'bg-slate-500', 'bg-red-400', 'bg-orange-400', 'bg-amber-400',
    'bg-yellow-400', 'bg-lime-400', 'bg-green-400',
];

// ─── Main Component ───

export function FinancialOverview() {
    const [data, setData] = useState<FinancialData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'month' | 'year'>('month');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchFinancials = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);

        try {
            const res = await fetch(`/api/dashboard/financials?period=${period}`);
            const json = await res.json();
            if (!json.error) {
                setData(json);
                setLastUpdated(new Date());
            }
        } catch (error) {
            // Use warning instead of error to prevent Next.js dev overlay 
            // from popping up when browser extensions intercept/block fetches
            console.warn("Failed to fetch financials", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [period]);

    // Initial fetch & period change
    useEffect(() => {
        fetchFinancials();
    }, [fetchFinancials]);

    // Auto-refresh every 30 seconds (silent)
    useEffect(() => {
        const interval = setInterval(() => fetchFinancials(true), REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchFinancials]);

    const getMarginColor = (margin: number) => {
        if (margin >= 50) return 'bg-emerald-100 text-emerald-800';
        if (margin >= 25) return 'bg-yellow-100 text-yellow-800';
        if (margin > 0) return 'bg-orange-100 text-orange-800';
        return 'bg-red-100 text-red-800';
    };

    if (loading) return <FinancialSkeleton />;
    if (!data) return null;

    const { overview, segments, costCenters, totalCostCenterExpense, operations } = data;

    // Only show segments that have nonzero data or are important revenue centers
    const activeSegments = segments.filter(s => s.revenue > 0 || s.grossProfit !== 0);
    const emptySegments = segments.filter(s => s.revenue === 0 && s.grossProfit === 0);

    return (
        <div className="col-span-12 space-y-6">
            {/* ═══════════════════════════════════════════════════════
                CARD 1: Segment-Wise Profit & Loss (Revenue Modules Only)
                ═══════════════════════════════════════════════════════ */}
            <Card className="border-slate-200 shadow-sm animate-in fade-in zoom-in duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-xl font-bold">
                            Revenue Performance
                        </CardTitle>
                        {isRefreshing && (
                            <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                        )}
                        {lastUpdated && (
                            <span className="text-xs text-slate-400">
                                Updated {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <Button
                            variant={period === 'month' ? 'outline' : 'ghost'}
                            size="sm"
                            className={`h-7 px-3 text-xs ${period === 'month' ? 'shadow-sm bg-white' : ''}`}
                            onClick={() => setPeriod('month')}
                        >
                            Month
                        </Button>
                        <Button
                            variant={period === 'year' ? 'outline' : 'ghost'}
                            size="sm"
                            className={`h-7 px-3 text-xs ${period === 'year' ? 'shadow-sm bg-white' : ''}`}
                            onClick={() => setPeriod('year')}
                        >
                            Year
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-4">
                    {/* Top Level KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 shadow-sm">
                            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">Total Revenue</p>
                            <h3 className="text-2xl font-bold text-emerald-900">{formatCurrency(overview.revenue)}</h3>
                            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-700">
                                <TrendingUp className="h-3 w-3" />
                                From {segments.length} revenue streams
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-white border border-red-100 shadow-sm">
                            <p className="text-xs text-red-600 font-semibold uppercase tracking-wider mb-1">Total Costs</p>
                            <h3 className="text-2xl font-bold text-red-900">{formatCurrency(overview.cogs + overview.opex + totalCostCenterExpense)}</h3>
                            <div className="flex items-center gap-1 mt-2 text-xs text-red-700">
                                <TrendingDown className="h-3 w-3" />
                                COGS + OpEx + Dept Costs
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 shadow-sm">
                            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Gross Profit</p>
                            <h3 className="text-2xl font-bold text-blue-900">{formatCurrency(overview.profit)}</h3>
                            <Progress value={Math.max(0, Math.min(100, overview.margin))} className="h-1.5 mt-2 bg-blue-100" />
                        </div>

                        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-100 shadow-sm">
                            <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Profit Margin</p>
                            <h3 className="text-2xl font-bold text-amber-900">{overview.margin.toFixed(1)}%</h3>
                            <div className="flex items-center gap-1 mt-2 text-xs text-amber-700">
                                <Activity className="h-3 w-3" />
                                {overview.margin >= 50 ? 'Healthy' : overview.margin >= 25 ? 'Moderate' : overview.margin > 0 ? 'Low' : 'Negative'}
                            </div>
                        </div>
                    </div>

                    {/* Revenue Segments Table */}
                    <div className="rounded-lg border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[200px]">Revenue Stream</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                    <TableHead className="text-right">COGS & OpEx</TableHead>
                                    <TableHead className="text-right">Gross Profit</TableHead>
                                    <TableHead className="text-right">Margin %</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeSegments.map((segment, i) => (
                                    <TableRow key={segment.moduleId} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`} />
                                            {segment.module}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-slate-700">
                                            {formatCurrency(segment.revenue)}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-500">
                                            {formatCurrency(segment.cogs + segment.opex)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-800">
                                            {formatCurrency(segment.grossProfit)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="secondary" className={`${getMarginColor(segment.margin)} border-0`}>
                                                {segment.margin.toFixed(1)}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Progress value={Math.max(0, segment.margin)} className="h-2 w-full bg-slate-100" />
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {/* Show inactive segments collapsed */}
                                {emptySegments.length > 0 && (
                                    <TableRow className="bg-slate-50/30">
                                        <TableCell colSpan={6} className="text-center text-xs text-slate-400 py-2">
                                            {emptySegments.length} other revenue stream{emptySegments.length > 1 ? 's' : ''} with no activity this period
                                            ({emptySegments.map(s => s.module).join(', ')})
                                        </TableCell>
                                    </TableRow>
                                )}

                                {/* Total Row */}
                                <TableRow className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                                    <TableCell>Total</TableCell>
                                    <TableCell className="text-right text-emerald-700">{formatCurrency(overview.revenue)}</TableCell>
                                    <TableCell className="text-right text-red-700">{formatCurrency(overview.cogs + overview.opex)}</TableCell>
                                    <TableCell className="text-right text-blue-700">{formatCurrency(overview.profit)}</TableCell>
                                    <TableCell className="text-right"></TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════
                CARD 2 & 3: Cost Centers + Operations Pulse (Side by Side)
                ═══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cost Centers Card */}
                <Card className="border-slate-200 shadow-sm animate-in fade-in slide-in-from-left duration-300">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            Departmental Cost Centers
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">Operational expenses by department</p>
                    </CardHeader>
                    <CardContent>
                        {costCenters.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="rounded-full bg-slate-100 p-3">
                                    <Activity className="h-5 w-5 text-slate-400" />
                                </div>
                                <p className="mt-2 text-sm text-slate-500">No departmental expenses recorded</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {costCenters.map((cost, i) => {
                                    const percentage = totalCostCenterExpense > 0
                                        ? (cost.totalExpense / totalCostCenterExpense) * 100
                                        : 0;
                                    return (
                                        <div key={cost.departmentId} className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${COST_COLORS[i % COST_COLORS.length]}`} />
                                                    <span className="text-sm font-medium text-slate-700">{cost.department}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-slate-800">{formatCurrency(cost.totalExpense)}</span>
                                                    <span className="text-xs text-slate-400 w-10 text-right">{percentage.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                            <Progress value={percentage} className="h-1.5 bg-slate-100" />
                                        </div>
                                    );
                                })}

                                {/* Total */}
                                <div className="pt-3 mt-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-900">Total Departmental Costs</span>
                                        <span className="text-sm font-bold text-red-700">{formatCurrency(totalCostCenterExpense)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Operations Pulse Card */}
                <Card className="border-slate-200 shadow-sm animate-in fade-in slide-in-from-right duration-300">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                            Operations Pulse
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">Live workload across departments</p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            {/* Open Support Tickets */}
                            <div className="relative overflow-hidden rounded-xl border border-slate-100 p-4 text-center bg-gradient-to-br from-cyan-50/50 to-white">
                                <p className="text-3xl font-bold text-cyan-700">{operations.openTickets}</p>
                                <p className="text-xs font-medium text-slate-500 mt-1">Open Tickets</p>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-cyan-100/50" />
                            </div>

                            {/* Active Projects */}
                            <div className="relative overflow-hidden rounded-xl border border-slate-100 p-4 text-center bg-gradient-to-br from-indigo-50/50 to-white">
                                <p className="text-3xl font-bold text-indigo-700">{operations.activeProjects}</p>
                                <p className="text-xs font-medium text-slate-500 mt-1">Active Projects</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">of {operations.totalProjects} total</p>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-indigo-100/50" />
                            </div>

                            {/* Open Leads */}
                            <div className="relative overflow-hidden rounded-xl border border-slate-100 p-4 text-center bg-gradient-to-br from-violet-50/50 to-white">
                                <p className="text-3xl font-bold text-violet-700">{operations.openLeads}</p>
                                <p className="text-xs font-medium text-slate-500 mt-1">Open Leads</p>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-violet-100/50" />
                            </div>
                        </div>

                        {/* Quick Context */}
                        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-xs text-slate-500">
                                {operations.openTickets > 5 ? (
                                    <span className="text-amber-600 font-medium">⚠ {operations.openTickets} support tickets need attention</span>
                                ) : operations.openTickets > 0 ? (
                                    <span className="text-blue-600 font-medium">✓ {operations.openTickets} tickets in queue — manageable workload</span>
                                ) : (
                                    <span className="text-emerald-600 font-medium">✓ All support tickets resolved — inbox zero!</span>
                                )}
                                {operations.openLeads > 0 && (
                                    <span className="ml-2 text-slate-400">• {operations.openLeads} CRM leads awaiting follow-up</span>
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function FinancialSkeleton() {
    return (
        <div className="col-span-12 space-y-6">
            <Card className="h-[400px]">
                <CardHeader>
                    <div className="h-8 w-[200px] bg-slate-200 animate-pulse rounded" />
                    <div className="h-4 w-[300px] bg-slate-200 animate-pulse rounded mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />
                        <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />
                        <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />
                        <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />
                    </div>
                    <div className="space-y-4">
                        <div className="h-12 w-full bg-slate-200 animate-pulse rounded" />
                        <div className="h-12 w-full bg-slate-200 animate-pulse rounded" />
                        <div className="h-12 w-full bg-slate-200 animate-pulse rounded" />
                    </div>
                </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-6">
                <Card className="h-[250px]">
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="h-6 w-48 bg-slate-200 animate-pulse rounded" />
                            <div className="h-4 w-full bg-slate-200 animate-pulse rounded" />
                            <div className="h-4 w-full bg-slate-200 animate-pulse rounded" />
                            <div className="h-4 w-3/4 bg-slate-200 animate-pulse rounded" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-[250px]">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
                            <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
                            <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
