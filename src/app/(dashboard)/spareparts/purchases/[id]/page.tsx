"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Printer, Calendar, Truck, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface PurchaseOrder {
    id: string;
    orderNumber: string;
    supplier: {
        name: string;
        email: string;
        phone: string;
    };
    status: string;
    expectedDate: string | null;
    receivedDate: string | null;
    notes: string | null;
    subtotal: number;
    taxAmount: number;
    total: number;
    isTaxEnabled: boolean;
    createdAt: string;
    items: {
        id: string;
        productName: string;
        productSku: string;
        quantity: number;
        receivedQty: number;
        unitCost: number;
        taxRate: number;
        taxAmount: number;
        lineTotal: number;
    }[];
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2
    }).format(amount);
}

export default function PurchaseOrderDetailPage() {
    const params = useParams();
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetch(`/api/spareparts/purchases/${params.id}`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error('Failed to load PO');
                })
                .then(setPo)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [params.id]);

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!po) return <div className="p-8 text-center text-red-500">Purchase Order not found</div>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800';
            case 'ORDERED': return 'bg-blue-100 text-blue-800';
            case 'RECEIVED': return 'bg-green-100 text-green-800';
            case 'PARTIAL_RECEIVED': return 'bg-yellow-100 text-yellow-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link href="/spareparts/purchases">
                        <Button variant="ghost" size="sm" className="mb-2 pl-0">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Purchases
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Truck className="h-8 w-8 text-primary" />
                        {po.orderNumber}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                        <span className="text-sm text-gray-500">
                            Created on {format(new Date(po.createdAt), 'PPP')}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    {/* Add Receive Button logic here later */}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: Supplier & Details */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Unit Cost</TableHead>
                                        {po.isTaxEnabled && <TableHead className="text-right">Tax</TableHead>}
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {po.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.productName}</div>
                                                <div className="text-xs text-gray-500">{item.productSku}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.quantity}
                                                {item.receivedQty > 0 && (
                                                    <div className="text-xs text-green-600">
                                                        Rec: {item.receivedQty}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(Number(item.unitCost))}</TableCell>
                                            {po.isTaxEnabled && (
                                                <TableCell className="text-right font-medium text-gray-600">
                                                    <div className="text-xs">{item.taxRate}%</div>
                                                    <div>{formatCurrency(Number(item.taxAmount))}</div>
                                                </TableCell>
                                            )}
                                            <TableCell className="text-right font-medium">{formatCurrency(Number(item.lineTotal))}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell colSpan={po.isTaxEnabled ? 4 : 3} className="text-right">Subtotal</TableCell>
                                        <TableCell className="text-right">{formatCurrency(Number(po.subtotal))}</TableCell>
                                    </TableRow>
                                    {po.isTaxEnabled && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-right">Tax (VAT)</TableCell>
                                            <TableCell className="text-right">{formatCurrency(Number(po.taxAmount))}</TableCell>
                                        </TableRow>
                                    )}
                                    <TableRow>
                                        <TableCell colSpan={po.isTaxEnabled ? 4 : 3} className="text-right font-bold">Total</TableCell>
                                        <TableCell className="text-right font-bold text-lg">{formatCurrency(Number(po.total))}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Supplier Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <div className="text-sm font-medium text-gray-500">Name</div>
                                <div className="text-lg font-semibold">{po.supplier.name}</div>
                            </div>
                            {po.supplier.email && (
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Email</div>
                                    <div>{po.supplier.email}</div>
                                </div>
                            )}
                            {po.supplier.phone && (
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Phone</div>
                                    <div>{po.supplier.phone}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Order Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {po.expectedDate && (
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <div className="text-sm font-medium">Expected Delivery</div>
                                        <div className="text-sm text-gray-600">{format(new Date(po.expectedDate), 'PPP')}</div>
                                    </div>
                                </div>
                            )}
                            {po.notes && (
                                <div className="flex items-start gap-3">
                                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <div className="text-sm font-medium">Notes</div>
                                        <div className="text-sm text-gray-600">{po.notes}</div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
