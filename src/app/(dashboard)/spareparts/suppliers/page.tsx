"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Truck, Plus, RefreshCw, Search, Phone, Mail, Building } from 'lucide-react';

interface Supplier {
    id: string;
    name: string;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    paymentTermDays: number;
    leadTimeDays: number;
    totalOrders: number;
    onTimeDelivery: number;
    status: string;
    _count: { purchaseOrders: number };
}

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchSuppliers = useCallback(async () => {
        try {
            setRefreshing(true);
            const res = await fetch('/api/spareparts/suppliers');
            if (res.ok) {
                const data = await res.json();
                setSuppliers(data.suppliers || []);
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const filteredSuppliers = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(search.toLowerCase()) ||
        supplier.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Truck className="h-8 w-8 text-primary" />
                        Suppliers
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your parts suppliers and vendors
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchSuppliers} disabled={refreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Link href="/spareparts/suppliers/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Supplier
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search suppliers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Suppliers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Supplier List</CardTitle>
                    <CardDescription>
                        {filteredSuppliers.length} suppliers found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            Loading suppliers...
                        </div>
                    ) : filteredSuppliers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Truck className="h-12 w-12 mb-2 opacity-50" />
                            <p>No suppliers found</p>
                            <Link href="/spareparts/suppliers/new" className="mt-4">
                                <Button>Add First Supplier</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Terms</TableHead>
                                        <TableHead className="text-right">Orders</TableHead>
                                        <TableHead>Performance</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSuppliers.map((supplier) => (
                                        <TableRow key={supplier.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                                        <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {supplier.name}
                                                        </p>
                                                        {supplier.contactPerson && (
                                                            <p className="text-sm text-gray-500">{supplier.contactPerson}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1 text-sm">
                                                    {supplier.phone && (
                                                        <div className="flex items-center gap-1">
                                                            <Phone className="h-3 w-3 text-gray-400" />
                                                            {supplier.phone}
                                                        </div>
                                                    )}
                                                    {supplier.email && (
                                                        <div className="flex items-center gap-1 text-gray-500">
                                                            <Mail className="h-3 w-3 text-gray-400" />
                                                            {supplier.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div>Payment: {supplier.paymentTermDays} days</div>
                                                <div className="text-gray-500">Lead: {supplier.leadTimeDays} days</div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {supplier._count.purchaseOrders}
                                            </TableCell>
                                            <TableCell>
                                                {supplier.totalOrders > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500 rounded-full"
                                                                style={{ width: `${Math.round(supplier.onTimeDelivery / supplier.totalOrders * 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm">
                                                            {Math.round(supplier.onTimeDelivery / supplier.totalOrders * 100)}%
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">No data</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={supplier.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                    {supplier.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/spareparts/suppliers/${supplier.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                        View
                                                    </Button>
                                                </Link>
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
