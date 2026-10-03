'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BoxIcon, MapPin, Activity, PackageOpen, TrendingUp, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

export default function WarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [warehouse, setWarehouse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/inventory/warehouses/${id}`);
            if (res.ok) {
                setWarehouse(await res.json());
            } else if (res.status === 404) {
                setWarehouse(null);
            } else {
                const errText = await res.text().catch(() => res.statusText);
                console.error(`Failed to load warehouse (${res.status}):`, errText);
                setWarehouse(null);
            }
        } catch (e) {
            console.error('Failed to load warehouse:', e);
            setWarehouse(null);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-8 max-w-[1400px] mx-auto min-h-screen bg-transparent flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    if (!warehouse) {
        return (
            <div className="p-8 space-y-8 max-w-[1400px] mx-auto min-h-screen">
                <div className="text-center mt-20 text-gray-500">
                    <h2 className="text-xl font-bold">Location Not Found</h2>
                </div>
            </div>
        );
    }

    const ledgers = warehouse.stockLedgers || [];
    const movements = warehouse.stockMovements || [];

    // Calculate total slot value
    const totalValue = ledgers.reduce((sum: number, ledger: any) => {
        const qty = Number(ledger.onHand) || 0;
        const cost = Number(ledger.product?.costPrice) || 0;
        return sum + (qty * cost);
    }, 0);

    // Top movers (highest absolute volume)
    const topMoversMap: Record<string, { product: any, volume: number }> = {};
    movements.forEach((m: any) => {
        if (!m.product) return;
        if (!topMoversMap[m.product.id]) {
            topMoversMap[m.product.id] = { product: m.product, volume: 0 };
        }
        topMoversMap[m.product.id].volume += Math.abs(Number(m.quantity));
    });

    const topMovers = Object.values(topMoversMap).sort((a, b) => b.volume - a.volume).slice(0, 5);

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">
            {/* Header */}
            <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                <button onClick={() => router.push('/inventory/warehouses')} className="flex items-center hover:text-indigo-600 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-1" /> All Locations
                </button>
                <span>/</span>
                <span className="text-gray-900">{warehouse.name}</span>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <MapPin className="h-8 w-8 text-indigo-600" />
                        {warehouse.name}
                    </h1>
                    <p className="text-gray-500 flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={warehouse.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                            {warehouse.isActive ? 'Active Node' : 'Inactive'}
                        </Badge>
                        {warehouse.location && `• ${warehouse.location}`}
                    </p>
                </div>
                <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm min-w-[200px] text-right">
                    <p className="text-sm text-gray-500 font-medium">Slot Valuation</p>
                    <p className="text-2xl font-bold text-indigo-600">{formatCurrency(totalValue)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Stock Ledgers */}
                <Card className="lg:col-span-2 shadow-sm border-gray-100 h-fit">
                    <CardHeader className="bg-white/50 border-b border-gray-50">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <PackageOpen className="h-5 w-5 text-indigo-500" />
                            Slot-Level Inventory
                        </CardTitle>
                        <CardDescription>Current on-hand assets residing at this physical node.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Unit Value</TableHead>
                                    <TableHead className="text-right font-bold text-gray-900">On Hand</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ledgers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-gray-400">Slot is completely empty.</TableCell>
                                    </TableRow>
                                ) : ledgers.map((l: any) => (
                                    <TableRow key={l.id}>
                                        <TableCell className="font-medium text-gray-900">{l.product?.name || 'Unknown'}</TableCell>
                                        <TableCell className="text-xs font-mono text-gray-500">{l.product?.sku}</TableCell>
                                        <TableCell className="text-right text-gray-600">{formatCurrency(Number(l.product?.costPrice || 0))}</TableCell>
                                        <TableCell className="text-right font-bold text-indigo-600">{Number(l.onHand)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Right Col: Top Movers & Recent Activity */}
                <div className="space-y-8">
                    <Card className="shadow-sm border-gray-100">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-md">
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                                Top Movers (By Volume)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topMovers.length === 0 ? (
                                    <p className="text-sm text-gray-400">No activity registered.</p>
                                ) : topMovers.map((t, i) => (
                                    <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">{t.product?.name}</p>
                                            <p className="text-xs text-gray-500 font-mono">{t.product?.sku}</p>
                                        </div>
                                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">{t.volume} units</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-gray-100">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-md">
                                <Activity className="h-4 w-4 text-rose-500" />
                                Recent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {movements.length === 0 ? (
                                    <p className="text-sm text-gray-400">No recent movements.</p>
                                ) : movements.map((m: any, i: number) => {
                                    const isOut = Number(m.direction) < 0;
                                    return (
                                        <div key={m.id || i} className="flex justify-between items-center">
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-0.5 p-1.5 rounded-full ${isOut ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                                                    {isOut ? <ArrowUpFromLine className="h-3 w-3 text-rose-600" /> : <ArrowDownToLine className="h-3 w-3 text-emerald-600" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{m.product?.name}</p>
                                                    <p className="text-xs text-gray-500">{(() => { const d = new Date(m.date); return isNaN(d.getTime()) ? 'Unknown date' : format(d, 'MMM d, h:mm a'); })()} • {m.type}</p>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-bold ${isOut ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {isOut ? '' : '+'}{Number(m.quantity) * Number(m.direction)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
