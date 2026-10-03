'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BoxIcon, Calendar, CheckCircle2, Factory, FileText, ShoppingCart, Truck, User } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useModuleAccess } from '@/hooks/useModulePermissions';
import { use } from 'react';

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [po, setPo] = useState<any>(null);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Receiving State
    const [isReceiving, setIsReceiving] = useState(false);
    const [receiveData, setReceiveData] = useState<Record<string, number>>({});
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [submitLoading, setSubmitLoading] = useState(false);

    const { canEdit } = useModuleAccess('inventory');

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [poRes, whRes] = await Promise.all([
                fetch(`/api/inventory/purchase-orders/${id}`),
                fetch('/api/inventory/warehouses')
            ]);
            if (poRes.ok) setPo(await poRes.json());
            if (whRes.ok) setWarehouses(await whRes.json());
        } catch (error) {
            console.error('Failed to load PO details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            const res = await fetch(`/api/inventory/purchase-orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'APPROVED' })
            });
            if (res.ok) {
                alert("PO Approved and Released to Vendor");
                loadData();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to approve PO');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to approve PO');
        }
    };

    const handleReceiveSubmit = async () => {
        if (!selectedWarehouseId) {
            alert('Please select a destination facility');
            return;
        }

        setSubmitLoading(true);
        const linesToReceive = Object.entries(receiveData).map(([lineId, qty]) => ({
            lineId,
            quantity: Number(qty)
        })).filter(x => x.quantity > 0);

        try {
            const res = await fetch(`/api/inventory/purchase-orders/${id}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destinationWarehouseId: selectedWarehouseId,
                    linesToReceive
                })
            });

            if (res.ok) {
                setIsReceiving(false);
                await loadData();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to receive items');
            }
        } catch (e: any) {
            console.error(e);
            alert(e.message || 'Failed to receive items');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (isLoading || !po) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50/30">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    const StatusConfig: Record<string, any> = {
        DRAFT: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Draft' },
        PENDING: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Pending Approval' },
        APPROVED: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Approved (Awaiting Receipt)' },
        RECEIVED: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Fulfilled' },
        PARTIAL: { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Partially Received' },
    };

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-[1400px] mx-auto min-h-screen bg-gray-50/30">
            {/* Header Navigation */}
            <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                <button onClick={() => router.push('/inventory/purchase-orders')} className="flex items-center hover:text-indigo-600 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Orders
                </button>
                <span>/</span>
                <span className="text-gray-900">{po.poNumber}</span>
            </div>

            {/* PO Header Card */}
            <Card className="shadow-sm border-gray-100 overflow-hidden relative">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${StatusConfig[po.status]?.color?.split(' ')[0] || 'bg-gray-200'}`} />
                <CardContent className="p-8">
                    <div className="flex flex-col lg:flex-row justify-between gap-8">
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-4xl font-bold tracking-tight text-gray-900">{po.poNumber}</h1>
                                    <Badge variant="outline" className={`px-2.5 py-1 text-sm ${StatusConfig[po.status]?.color}`}>
                                        {StatusConfig[po.status]?.label || po.status}
                                    </Badge>
                                </div>
                                <p className="text-gray-500 flex items-center gap-2">
                                    <User className="h-4 w-4" /> {po.supplier?.name || 'Unknown Vendor'}
                                </p>
                            </div>

                            <div className="flex gap-8">
                                <div className="space-y-1 text-sm">
                                    <p className="text-gray-500 font-medium flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Order Date</p>
                                    <p className="text-gray-900 font-semibold">{po.createdAt && !isNaN(new Date(po.createdAt).getTime()) ? new Date(po.createdAt).toLocaleDateString() : '—'}</p>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <p className="text-gray-500 font-medium flex items-center gap-1.5"><Truck className="h-4 w-4" /> Expected</p>
                                    <p className="text-gray-900 font-semibold">{(po.expectedDate || po.expectedAt) && !isNaN(new Date(po.expectedDate || po.expectedAt).getTime()) ? new Date(po.expectedDate || po.expectedAt).toLocaleDateString() : '—'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-6 justify-between">
                            <div className="text-right space-y-1">
                                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Value</p>
                                <p className="text-4xl font-bold text-gray-900">{formatCurrency(Number(po.total) || 0)}</p>
                            </div>

                            {canEdit && (
                                <div className="flex gap-3">
                                    {po.status === 'DRAFT' || po.status === 'PENDING' ? (
                                        <Button onClick={handleApprove} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Approve & Release
                                        </Button>
                                    ) : (po.status === 'APPROVED' || po.status === 'PARTIAL') ? (
                                        <Button onClick={() => {
                                            const initialData: Record<string, number> = {};
                                            po.lines?.forEach((l: any) => {
                                                const remaining = Number(l.quantity) - Number(l.receivedQty || 0);
                                                initialData[l.id] = remaining > 0 ? remaining : 0;
                                            });
                                            setReceiveData(initialData);
                                            setIsReceiving(true);
                                        }} className="bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                                            <BoxIcon className="h-4 w-4 mr-2" />
                                            Receive Items
                                        </Button>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Line Items */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-indigo-600" />
                    Requested Line Items
                </h3>
                <Card className="shadow-sm border-gray-100">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead className="w-[400px]">Product / Asset</TableHead>
                                    <TableHead>Expected Date</TableHead>
                                    <TableHead className="text-right">Unit Cost</TableHead>
                                    <TableHead className="text-right">Qty Ordered</TableHead>
                                    <TableHead className="text-right">Qty Received</TableHead>
                                    <TableHead className="text-right">Total Line Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="bg-white">
                                {(!po.lines || po.lines.length === 0) ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-gray-500">No items on this order.</TableCell>
                                    </TableRow>
                                ) : (po.lines ?? []).map((line: any) => {
                                    const ordered = Number(line.quantity);
                                    const received = Number(line.receivedQty || 0);
                                    const isFullyReceived = received >= ordered;
                                    return (
                                        <TableRow key={line.id} className="hover:bg-gray-50/50 group">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-50 rounded border border-indigo-100">
                                                        <Factory className="h-4 w-4 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{line.product?.name || line.description || 'Custom Item'}</p>
                                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{line.product?.sku || 'Non-Catalog'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-600 text-sm">
                                                {(() => { if (!line.expectedDate) return '—'; const d = new Date(line.expectedDate); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(); })()}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-gray-600">
                                                {formatCurrency(Number(line.unitCost))}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-gray-900">
                                                {ordered}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className={`font-semibold ${isFullyReceived ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600'}`}>
                                                    {received}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-gray-900">
                                                {formatCurrency(Number(line.lineTotal))}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Receive Sheet */}
            <Sheet open={isReceiving} onOpenChange={setIsReceiving}>
                <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto bg-gray-50 sm:rounded-l-2xl border-l border-gray-200">
                    <SheetHeader className="pb-6 mb-6 border-b border-gray-200">
                        <SheetTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
                            <BoxIcon className="h-5 w-5 text-emerald-600" />
                            Receive Stock
                        </SheetTitle>
                        <SheetDescription>
                            Record physical receipt of goods and place them into a destination facility.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6">
                        <div className="space-y-3 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                            <label className="text-sm font-bold text-gray-900">Destination Facility</label>
                            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select warehouse or yard to receive items..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map(w => (
                                        <SelectItem key={w.id} value={w.id}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{w.name}</span>
                                                <span className="text-gray-400 text-xs">({w.code})</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Ordered</TableHead>
                                        <TableHead className="text-right">Previously Received</TableHead>
                                        <TableHead className="text-right w-[150px]">Receiving Now</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {po.lines?.map((line: any) => {
                                        const ordered = Number(line.quantity);
                                        const received = Number(line.receivedQty || 0);
                                        const remaining = ordered - received;

                                        if (remaining <= 0) return null;

                                        return (
                                            <TableRow key={line.id}>
                                                <TableCell>
                                                    <p className="font-medium text-gray-900 text-sm line-clamp-1">{line.product?.name || line.description}</p>
                                                </TableCell>
                                                <TableCell className="text-right text-gray-500">{ordered}</TableCell>
                                                <TableCell className="text-right text-gray-500">{received}</TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max={remaining}
                                                        value={receiveData[line.id] ?? 0}
                                                        onChange={(e) => {
                                                        const v = Number(e.target.value) || 0;
                                                        const clamped = Math.max(0, Math.min(remaining, v));
                                                        setReceiveData({ ...receiveData, [line.id]: clamped });
                                                    }}
                                                        className="text-right font-semibold"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <SheetFooter className="mt-8 border-t border-gray-200 pt-6">
                        <Button variant="outline" onClick={() => setIsReceiving(false)}>Cancel</Button>
                        <Button onClick={handleReceiveSubmit} disabled={submitLoading} className="bg-emerald-600 hover:bg-emerald-700">
                            {submitLoading ? 'Processing...' : 'Confirm Receipt'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}
