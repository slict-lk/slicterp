"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Users, Plus, Search, Phone, Mail, Building, RefreshCw } from 'lucide-react';

interface Customer {
    id: string;
    customerNumber: string;
    name: string;
    email: string | null;
    phone: string;
    businessName: string | null;
    customerType: string;
    totalPurchases: number;
    loyaltyPoints: number;
    status: string;
    createdAt: string;
    _count: { invoices: number; vehicleHistory: number };
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
    }).format(amount);
}

const customerTypeColors: Record<string, string> = {
    RETAIL: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    WHOLESALE: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    MECHANIC: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    FLEET: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    VIP: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [refreshing, setRefreshing] = useState(false);

    const fetchCustomers = useCallback(async () => {
        try {
            setRefreshing(true);
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);

            const res = await fetch(`/api/spareparts/customers?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.customers || []);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search, typeFilter]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchCustomers();
        }, 300);
        return () => clearTimeout(debounce);
    }, [fetchCustomers]);

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
                        <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        Customers
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                        Manage your customer database
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={fetchCustomers} disabled={refreshing} className="w-full sm:w-auto">
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Link href="/spareparts/customers/new" className="w-full sm:w-auto">
                        <Button className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Customer
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by name, phone, or customer number..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Customer Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="RETAIL">Retail</SelectItem>
                                <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                                <SelectItem value="MECHANIC">Mechanic</SelectItem>
                                <SelectItem value="FLEET">Fleet</SelectItem>
                                <SelectItem value="VIP">VIP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Customer Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Customer List</CardTitle>
                    <CardDescription>
                        {customers.length} customers found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            Loading customers...
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Users className="h-12 w-12 mb-2 opacity-50" />
                            <p>No customers found</p>
                            <Link href="/spareparts/customers/new" className="mt-4">
                                <Button>Add First Customer</Button>
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Total Purchases</TableHead>
                                            <TableHead className="text-right">Invoices</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customers.map((customer) => (
                                            <TableRow key={customer.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {customer.name}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {customer.customerNumber}
                                                            {customer.businessName && ` • ${customer.businessName}`}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <Phone className="h-3 w-3 text-gray-400" />
                                                            {customer.phone}
                                                        </div>
                                                        {customer.email && (
                                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                                <Mail className="h-3 w-3 text-gray-400" />
                                                                {customer.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={customerTypeColors[customer.customerType] || ''}>
                                                        {customer.customerType}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(customer.totalPurchases)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {customer._count.invoices}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={customer.status === 'ACTIVE' ? 'default' : 'secondary'}
                                                    >
                                                        {customer.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Link href={`/spareparts/customers/${customer.id}`}>
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

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {customers.map((customer) => (
                                    <Card key={customer.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                        {customer.name}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                                                        {customer.customerNumber}
                                                    </p>
                                                    {customer.businessName && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                                                            <Building className="h-3 w-3" />
                                                            {customer.businessName}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge className={customerTypeColors[customer.customerType] || ''}>
                                                    {customer.customerType}
                                                </Badge>
                                            </div>

                                            <div className="space-y-2 mb-3">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Phone className="h-4 w-4 text-gray-400" />
                                                    <span>{customer.phone}</span>
                                                </div>
                                                {customer.email && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <Mail className="h-4 w-4 text-gray-400" />
                                                        <span className="truncate">{customer.email}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t">
                                                <div className="flex gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Total Purchases</p>
                                                        <p className="font-semibold">{formatCurrency(customer.totalPurchases)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 text-xs">Invoices</p>
                                                        <p className="font-semibold">{customer._count.invoices}</p>
                                                    </div>
                                                </div>
                                                <Link href={`/spareparts/customers/${customer.id}`}>
                                                    <Button size="sm">
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
