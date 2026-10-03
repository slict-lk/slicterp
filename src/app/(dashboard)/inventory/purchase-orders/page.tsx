'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, ChevronRight, FileText, PlusCircle, Search, ShoppingCart, Truck, User } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useModuleAccess } from '@/hooks/useModulePermissions';
import Link from 'next/link';

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { canEdit } = useModuleAccess('inventory');

    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/inventory/purchase-orders');
                if (res.ok) {
                    const data = await res.json();
                    setOrders(data);
                } else {
                    setError('Failed to load purchase orders');
                }
            } catch (error: any) {
                console.error('Failed to fetch orders:', error);
                setError(error.message || 'Network error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter((o) => {
            const matchesSearch =
                o.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [orders, searchTerm, filterStatus]);

    const StatusConfig: Record<string, any> = {
        DRAFT: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Draft' },
        PENDING: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Pending Approval' },
        APPROVED: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Approved (Awaiting Receipt)' },
        RECEIVED: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Fulfilled / Received' },
    };

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/30">
            <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Purchase Orders</h1>
                    <p className="text-gray-500">Manage incoming shipments, vendor restocks, and procurement lifecycles.</p>
                </div>
                {canEdit && (
                    <Link href="/inventory/purchase-orders/new">
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Create PO
                        </Button>
                    </Link>
                )}
            </div>

            <Card className="shadow-sm border-gray-100">
                <CardHeader className="bg-white/50 border-b border-gray-50 pb-4">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="relative w-full xl:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search PO Number or Vendor Name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 w-full bg-white border-gray-200"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-lg border border-gray-200/60 overflow-x-auto">
                            {['ALL', 'DRAFT', 'PENDING', 'APPROVED', 'RECEIVED'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-4 py-1.5 text-sm font-medium whitespace-nowrap rounded-md transition-colors ${filterStatus === status ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600 hover:bg-gray-200/50'}`}
                                >
                                    {status === 'ALL' ? 'All Orders' : StatusConfig[status]?.label || status}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                        </div>
                    ) : error ? (
                        <div className="h-64 flex flex-col items-center justify-center space-y-4">
                            <p className="text-rose-500 font-medium">{error}</p>
                            <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto w-full">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead>PO Reference</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Lifecycle Status</TableHead>
                                        <TableHead className="text-right">Items</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                        <TableHead className="text-right">Order Date</TableHead>
                                        <TableHead className="w-[80px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="bg-white">
                                    {filteredOrders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-48 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center space-y-2">
                                                    <FileText className="h-10 w-10 text-gray-300" />
                                                    <p>No purchase orders matching criteria.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredOrders.map((o) => (
                                        <TableRow key={o.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-50 rounded-lg shrink-0 border border-indigo-100">
                                                        <ShoppingCart className="h-4 w-4 text-indigo-600" />
                                                    </div>
                                                    <span className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{o.poNumber ?? '-'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-gray-400" />
                                                    <span className="font-medium text-gray-700">{o.supplier?.name || 'Unknown Vendor'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`px-2.5 py-1 ${StatusConfig[o.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                    {o.status === 'RECEIVED' ? <Truck className="h-3 w-3 mr-1.5" /> : null}
                                                    {StatusConfig[o.status]?.label || o.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-gray-600">
                                                {o.lines?.length || 0} lines
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-bold text-gray-900">{formatCurrency(o.total || 0)}</span>
                                            </TableCell>
                                            <TableCell className="text-right text-gray-500">
                                                <div className="flex items-center justify-end gap-1.5 text-sm">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {(() => { const d = new Date(o.createdAt); return !isNaN(d.getTime()) ? d.toLocaleDateString() : '-'; })()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end pr-2">
                                                    <Link href={`/inventory/purchase-orders/${o.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
