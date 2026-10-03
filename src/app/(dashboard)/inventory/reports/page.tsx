'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, TrendingUp, Layers, BoxIcon } from 'lucide-react';

export default function InventoryReportsPage() {
    const [valuationData, setValuationData] = useState<any[]>([]);
    const [abcData, setAbcData] = useState<any[]>([]);
    const [turnoverData, setTurnoverData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAllReports();
    }, []);

    const loadAllReports = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [valRes, abcRes, toRes] = await Promise.all([
                fetch('/api/inventory/reports/valuation'),
                fetch('/api/inventory/reports/abc'),
                fetch('/api/inventory/reports/turnover')
            ]);

            if (valRes.ok) {
                const valData = await valRes.json();
                setValuationData(Array.isArray(valData?.data) ? valData.data : (Array.isArray(valData) ? valData : []));
            } else { setError(prev => prev || 'Failed to load valuation reports'); }

            if (abcRes.ok) {
                const d = await abcRes.json();
                setAbcData(Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []));
            } else { setError(prev => prev || 'Failed to load abc reports'); }

            if (toRes.ok) {
                const t = await toRes.json();
                setTurnoverData(Array.isArray(t?.data) ? t.data : (Array.isArray(t) ? t : []));
            } else { setError(prev => prev || 'Failed to load turnover reports'); }
        } catch (e: any) {
            setError(e.message || 'Network error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-[1400px] mx-auto min-h-screen bg-gray-50/30">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                    <BarChart3 className="h-8 w-8 text-indigo-600" />
                    Intelligence & Reports
                </h1>
                <p className="text-gray-500 mt-2">Deep-dive analytics on asset performance, inventory cost, and velocity.</p>
            </div>

            {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                </div>
            ) : error ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <p className="text-rose-500 font-medium">{error}</p>
                    <button className="px-4 py-2 border rounded hover:bg-gray-50 text-gray-700" onClick={loadAllReports}>Retry</button>
                </div>
            ) : (
                <Tabs defaultValue="valuation" className="w-full space-y-6">
                    <TabsList className="bg-white border border-gray-200 shadow-sm p-1 rounded-lg">
                        <TabsTrigger value="valuation" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-md px-6 py-2 transition-all">
                            <Layers className="h-4 w-4 mr-2" /> Asset Valuation
                        </TabsTrigger>
                        <TabsTrigger value="abc" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-md px-6 py-2 transition-all">
                            <BoxIcon className="h-4 w-4 mr-2" /> ABC Classifications
                        </TabsTrigger>
                        <TabsTrigger value="turnover" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-md px-6 py-2 transition-all">
                            <TrendingUp className="h-4 w-4 mr-2" /> Stock Turnover
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="valuation" className="mt-0 outline-none">
                        <Card className="shadow-sm border-gray-100">
                            <CardHeader>
                                <CardTitle>Global Valuation Summary</CardTitle>
                                <CardDescription>Real-time valuation computations per product based on average moving costs.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-gray-50/50">
                                        <TableRow>
                                            <TableHead>Asset Title</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Moving Avg Cost</TableHead>
                                            <TableHead className="text-right">QOH</TableHead>
                                            <TableHead className="text-right text-indigo-700 font-bold">Total Valuation</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {valuationData.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="h-32 text-center text-gray-400">No data generated.</TableCell></TableRow>
                                        ) : valuationData.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium text-gray-900">{row.productName}</TableCell>
                                                <TableCell className="text-gray-500">{row.category || '—'}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.averageCost)}</TableCell>
                                                <TableCell className="text-right font-semibold">{row.stockQty}</TableCell>
                                                <TableCell className="text-right font-bold text-gray-900 tracking-tight">{formatCurrency(row.totalValue)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="abc" className="mt-0 outline-none">
                        <Card className="shadow-sm border-gray-100">
                            <CardHeader>
                                <CardTitle>ABC Analysis</CardTitle>
                                <CardDescription>Categorized asset tiering prioritizing high-value elements based on utilization distribution.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-gray-50/50">
                                        <TableRow>
                                            <TableHead>Asset Title</TableHead>
                                            <TableHead className="text-right">Valuation Share</TableHead>
                                            <TableHead className="text-center">ABC Class</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {abcData.length === 0 ? (
                                            <TableRow><TableCell colSpan={3} className="h-32 text-center text-gray-400">No data generated.</TableCell></TableRow>
                                        ) : abcData.map((row, i) => {
                                            const c = row.classification;
                                            return (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium text-gray-900">{row.productName}</TableCell>
                                                    <TableCell className="text-right text-gray-600">{(typeof row.percentOfTotalValue === 'number' ? row.percentOfTotalValue : 0).toFixed(2)}%</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge className={c === 'A' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : c === 'B' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}>
                                                            Tier {c}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="turnover" className="mt-0 outline-none">
                        <Card className="shadow-sm border-gray-100">
                            <CardHeader>
                                <CardTitle>Stock Velocity & Turnover</CardTitle>
                                <CardDescription>Performance tracking over defined periods showing liquidation rates.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-gray-50/50">
                                        <TableRow>
                                            <TableHead>Asset Title</TableHead>
                                            <TableHead className="text-right">COGS (Last 30d)</TableHead>
                                            <TableHead className="text-right">Turnover Ratio</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {turnoverData.length === 0 ? (
                                            <TableRow><TableCell colSpan={3} className="h-32 text-center text-gray-400">No data generated.</TableCell></TableRow>
                                        ) : turnoverData.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium text-gray-900">{row.productName}</TableCell>
                                                <TableCell className="text-right text-gray-600">{formatCurrency(row.cogs)}</TableCell>
                                                <TableCell className="text-right font-bold text-indigo-600">{typeof row.turnoverRatio === 'number' ? row.turnoverRatio.toFixed(2) + 'x' : '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            )}
        </div>
    );
}
