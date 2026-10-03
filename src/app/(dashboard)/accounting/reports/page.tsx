"use client";

import { useState, useEffect } from "react";
import {
    BarChart3,
    Calendar,
    Download,
    Filter
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";

export default function FinancialReportsPage() {
    const [activeTab, setActiveTab] = useState("pl");
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [dateRangeError, setDateRangeError] = useState<string | null>(null);

    const fetchReport = async (type: string, signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            let url = "";
            if (type === "pl") url = `/api/accounting/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`;
            else if (type === "bs") url = `/api/accounting/reports/balance-sheet?asOfDate=${endDate}`;
            else if (type === "tb") url = `/api/accounting/reports/trial-balance?asOfDate=${endDate}`;
            else if (type === "ar") url = `/api/accounting/reports/ar-aging?asOfDate=${endDate}&type=AR`;
            else {
                setError(`Unknown report type: ${type}`);
                setLoading(false);
                return;
            }

            const res = await fetch(url, signal ? { signal } : undefined);
            if (res.ok) {
                setReportData(await res.json());
            } else {
                const err = await res.json();
                setError(err.error || "Failed to load report data.");
            }
        } catch (err: any) {
            if (err?.name === 'AbortError') return;
            console.error(err);
            setError("Unexpected error loading report.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        toast.info("Preparing report for export...");
        setTimeout(() => {
            window.print();
        }, 500);
    };

    const handleFilters = () => {
        toast("Filter Options", {
            description: "Advanced filtering is currently managed via the date range selectors below."
        });
    };

    useEffect(() => {
        // Validate date range
        if (activeTab === 'pl' && new Date(endDate) < new Date(startDate)) {
            setDateRangeError('End date cannot be earlier than start date.');
            return;
        }
        setDateRangeError(null);

        const controller = new AbortController();
        fetchReport(activeTab, controller.signal);
        return () => controller.abort();
    }, [activeTab, startDate, endDate]);

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                        <span className="p-2 rounded-xl bg-orange-600 shadow-lg shadow-orange-600/20 text-white">
                            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
                        </span>
                        Financial Reports
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Analyze performance, liquidity, and aging metrics.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={handleFilters}>
                        <Filter className="w-4 h-4 mr-2" />
                        More Filters
                    </Button>
                    <Button className="w-full sm:w-auto" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Report tabs */}
            <Tabs defaultValue="pl" onValueChange={setActiveTab} className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <TabsList>
                        <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
                        <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
                        <TabsTrigger value="tb">Trial Balance</TabsTrigger>
                        <TabsTrigger value="ar">AR Aging</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => {
                            setStartDate(e.target.value);
                            if (new Date(endDate) < new Date(e.target.value)) setDateRangeError('End date cannot be earlier than start date.');
                            else setDateRangeError(null);
                        }}
                            className="bg-transparent border rounded px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
                            disabled={["bs", "tb", "ar"].includes(activeTab)}
                        />
                        <span className="text-gray-400">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => {
                            setEndDate(e.target.value);
                            if (new Date(e.target.value) < new Date(startDate)) setDateRangeError('End date cannot be earlier than start date.');
                            else setDateRangeError(null);
                        }}
                            className="bg-transparent border rounded px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
                        />
                    </div>
                </div>

                {dateRangeError && (
                    <p className="text-sm text-red-500 mt-1">{dateRangeError}</p>
                )}

                {/* Profit & Loss */}
                <TabsContent value="pl">
                    <Card>
                        <CardHeader className="text-center border-b">
                            <CardTitle className="text-lg">Statement of Profit & Loss</CardTitle>
                            <CardDescription>
                                For the period {format(new Date(`${startDate}T00:00:00`), 'MMM dd, yyyy')} to {format(new Date(`${endDate}T00:00:00`), 'MMM dd, yyyy')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            {loading ? (
                                <div className="text-center py-12 text-gray-500">Generating report...</div>
                            ) : error ? (
                                <div className="text-center py-12 text-red-500">{error}</div>
                            ) : !reportData ? (
                                <div className="text-center py-12 text-gray-500">No data available.</div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Revenue */}
                                    <div>
                                        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3 border-b pb-2">Revenue</h4>
                                        <div className="space-y-2">
                                            {reportData.revenues?.map((r: any) => (
                                                <div key={r.id} className="flex justify-between items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md text-sm">
                                                    <span className="text-gray-600 dark:text-gray-300"><span className="text-gray-400 mr-2">{r.code}</span> {r.name}</span>
                                                    <span className="font-medium">{formatCurrency(r.total, 'LKR')}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center px-3 pt-3 border-t font-semibold">
                                                <span>Total Revenue</span>
                                                <span className="text-green-600 dark:text-green-400">{formatCurrency(reportData.totalRevenue, 'LKR')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expenses */}
                                    <div>
                                        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3 border-b pb-2">Operating Expenses</h4>
                                        <div className="space-y-2">
                                            {reportData.expenses?.map((e: any) => (
                                                <div key={e.id} className="flex justify-between items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md text-sm">
                                                    <span className="text-gray-600 dark:text-gray-300"><span className="text-gray-400 mr-2">{e.code}</span> {e.name}</span>
                                                    <span className="font-medium">{formatCurrency(e.total, 'LKR')}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center px-3 pt-3 border-t font-semibold">
                                                <span>Total Expenses</span>
                                                <span className="text-red-600 dark:text-red-400">{formatCurrency(reportData.totalExpense, 'LKR')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Net Income */}
                                    <div className={`flex justify-between items-center px-4 py-4 rounded-xl border-2 font-bold text-lg ${reportData.netProfit >= 0
                                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                        : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                        }`}>
                                        <span className={reportData.netProfit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                            Net Income
                                        </span>
                                        <span className={reportData.netProfit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                            {formatCurrency(reportData.netProfit, 'LKR')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="bs">
                    <Card>
                        <CardContent className="text-center py-12 text-gray-500">
                            Balance Sheet report — switch dates and data will load from the API.
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="tb">
                    <Card>
                        <CardContent className="text-center py-12 text-gray-500">
                            Trial Balance report — switch dates and data will load from the API.
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="ar">
                    <Card>
                        <CardContent className="text-center py-12 text-gray-500">
                            AR Aging report — switch dates and data will load from the API.
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
