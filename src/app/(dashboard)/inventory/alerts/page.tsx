'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Factory, ArrowRight } from 'lucide-react';

export default function ReorderAlertsPage() {
    const router = useRouter();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAlerts();
    }, []);

    const loadAlerts = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/inventory/alerts');
            if (res.ok) {
                setAlerts(await res.json());
            } else {
                setError('Failed to load alerts');
            }
        } catch (e: any) {
            setError(e.message || 'Network error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-[1400px] mx-auto min-h-screen bg-gray-50/30">
            <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-rose-500" />
                        Reorder Alerts Queue
                    </h1>
                    <p className="text-gray-500 mt-2">Items currently below their defined minimum stocking thresholds.</p>
                </div>
                {alerts.length > 0 && (
                    <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => router.push('/inventory/purchase-orders')}>
                        Generate Draft POs
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                )}
            </div>

            <Card className="shadow-sm border-gray-100 border-t-rose-500 border-t-4">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
                        </div>
                    ) : error ? (
                        <div className="h-64 flex flex-col items-center justify-center space-y-4">
                            <p className="text-rose-500 font-medium">{error}</p>
                            <Button variant="outline" onClick={loadAlerts}>Retry</Button>
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto w-full">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="w-[400px]">Product / Asset</TableHead>
                                        <TableHead className="text-right">Current Stock</TableHead>
                                        <TableHead className="text-right">Minimum Threshold</TableHead>
                                        <TableHead className="text-right">Deficit Amount</TableHead>
                                        <TableHead className="text-center w-[150px]">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="bg-white">
                                    {alerts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-64 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center space-y-3">
                                                    <div className="p-4 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-500">
                                                        <CheckCircleIcon className="h-8 w-8" />
                                                    </div>
                                                    <p className="font-medium text-gray-900">Inventory Status Healthy</p>
                                                    <p className="text-sm">No assets are currently below minimum thresholds.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : alerts.map((a) => {
                                        const deficit = Number(a.minStockQty) - Number(a.stockQty);
                                        return (
                                            <TableRow key={a.id} className="hover:bg-rose-50/30 transition-colors group">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-rose-50 rounded-lg shrink-0 border border-rose-100">
                                                            <Factory className="h-4 w-4 text-rose-600" />
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors block">{a.name}</span>
                                                            <span className="text-xs font-mono text-gray-500">{a.sku}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className="font-bold text-gray-900">{Number(a.stockQty)}</span>
                                                </TableCell>
                                                <TableCell className="text-right text-gray-500">
                                                    {Number(a.minStockQty)}
                                                </TableCell>
                                                <TableCell className="text-right text-rose-600 font-semibold text-lg">
                                                    {deficit > 0 ? `-${deficit}` : '0'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={`font-semibold ${deficit > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                        {deficit > 0 ? 'Critical' : 'Warning'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

const CheckCircleIcon = (props: any) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
)
