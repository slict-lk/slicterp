"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DollarSign, Plus, RefreshCw, FileText, Eye } from 'lucide-react';

interface Invoice {
    id: string;
    invoiceNumber: string;
    customer: { name: string } | null;
    customerName: string | null;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    paidAmount: number;
    dueAmount: number;
    status: string;
    paymentStatus: string;
    source: string;
    createdAt: string;
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
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}

const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    REFUNDED: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
};

const paymentStatusColors: Record<string, string> = {
    UNPAID: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    PARTIAL: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    PAID: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    REFUNDED: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function SalesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [paymentFilter, setPaymentFilter] = useState<string>('all');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [refreshing, setRefreshing] = useState(false);

    const fetchInvoices = useCallback(async () => {
        try {
            setRefreshing(true);
            const params = new URLSearchParams();
            if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
            if (paymentFilter && paymentFilter !== 'all') params.set('paymentStatus', paymentFilter);
            if (sourceFilter && sourceFilter !== 'all') params.set('source', sourceFilter);

            const res = await fetch(`/api/spareparts/sales?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setInvoices(data.invoices || []);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter, paymentFilter, sourceFilter]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
                        <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        Sales & Invoices
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                        View and manage all sales transactions
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={fetchInvoices} disabled={refreshing} className="w-full sm:w-auto">
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

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Invoice Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Payment Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Payments</SelectItem>
                                <SelectItem value="UNPAID">Unpaid</SelectItem>
                                <SelectItem value="PARTIAL">Partial</SelectItem>
                                <SelectItem value="PAID">Paid</SelectItem>
                                <SelectItem value="OVERDUE">Overdue</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={sourceFilter} onValueChange={setSourceFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Order Source" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sources</SelectItem>
                                <SelectItem value="POS">POS (In-Store)</SelectItem>
                                <SelectItem value="ONLINE">Online Orders</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Invoice Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Invoice List</CardTitle>
                    <CardDescription>
                        {invoices.length} invoices found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            Loading invoices...
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <FileText className="h-12 w-12 mb-2 opacity-50" />
                            <p>No invoices found</p>
                            <Link href="/spareparts/pos" className="mt-4">
                                <Button>Create First Sale</Button>
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Paid</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Payment</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.map((invoice) => (
                                            <TableRow key={invoice.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {invoice.invoiceNumber}
                                                            </p>
                                                            {invoice.source === 'ONLINE' && (
                                                                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-[10px] px-1.5 py-0">
                                                                    ONLINE
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-500">
                                                            {invoice._count.items} items
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {invoice.customerName || invoice.customer?.name || 'Walk-in'}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {formatDate(invoice.createdAt)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(invoice.total)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(invoice.paidAmount)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={statusColors[invoice.status] || ''}>
                                                        {invoice.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={paymentStatusColors[invoice.paymentStatus] || ''}>
                                                        {invoice.paymentStatus}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Link href={`/spareparts/sales/${invoice.id}`}>
                                                        <Button variant="ghost" size="sm">
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            View
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {invoices.map((invoice) => (
                                    <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                                        {invoice.invoiceNumber}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                                        {invoice.customerName || invoice.customer?.name || 'Walk-in'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {formatDate(invoice.createdAt)} • {invoice._count.items} items
                                                    </p>
                                                </div>
                                                <Badge className={statusColors[invoice.status] || ''}>
                                                    {invoice.status}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t">
                                                <div className="flex flex-col gap-1">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Total</p>
                                                        <p className="font-bold text-lg text-primary">
                                                            {formatCurrency(invoice.total)}
                                                        </p>
                                                    </div>
                                                    <Badge className={paymentStatusColors[invoice.paymentStatus] || ''} variant="outline">
                                                        {invoice.paymentStatus}
                                                    </Badge>
                                                </div>
                                                <Link href={`/spareparts/sales/${invoice.id}`}>
                                                    <Button size="sm">
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
