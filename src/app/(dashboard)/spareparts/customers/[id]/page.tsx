"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Wallet, History, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface CreditTransaction {
    id: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT' | 'ADJUSTMENT';
    description: string;
    referenceId?: string;
    balanceAfter: number;
    createdAt: string;
}

interface Customer {
    id: string;
    customerNumber: string;
    name: string;
    businessName: string | null;
    email: string | null;
    phone: string;
    address: string | null;
    city: string | null;
    customerType: string;
    status: string;
    creditLimit: number;
    creditBalance: number;
    paymentTermDays: number;
    totalPurchases: number;
    loyaltyPoints: number;
    createdAt: string;
    transactions?: CreditTransaction[];
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2,
    }).format(amount);
}

const customerTypeColors: Record<string, string> = {
    RETAIL: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    WHOLESALE: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    MECHANIC: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    FLEET: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    VIP: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

export default function CustomerProfilePage() {
    const params = useParams();
    const router = useRouter();
        const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<any>(null);

    const fetchCustomer = useCallback(async () => {
        try {
            const res = await fetch(`/api/spareparts/customers/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setCustomer(data);
            } else {
                const errData = await res.json().catch(() => ({ error: res.statusText }));
                setError(errData.error || `Error ${res.status}`);
                setDebugInfo({ status: res.status, ...errData });
                toast.error('Error', { description: errData.error || 'Failed to fetch customer details' });
            }
        } catch (error: any) {
            console.error('Error fetching customer:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [params.id, toast]);

    useEffect(() => {
        if (params.id) {
            fetchCustomer();
        }
    }, [params.id, fetchCustomer]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !customer) {
        return (
            <div className="p-6 text-center">
                <h1 className="text-2xl font-bold text-red-600">
                    {error || 'Customer Not Found'}
                </h1>
                {debugInfo && (
                    <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-left inline-block max-w-lg overflow-auto">
                        <p className="font-mono text-xs text-red-500">
                            Debug Info: {JSON.stringify(debugInfo, null, 2)}
                        </p>
                    </div>
                )}
                <div className="mt-8">
                    <Link href="/spareparts/customers">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Customers
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const creditUtilization = customer.creditLimit > 0
        ? (customer.creditBalance / customer.creditLimit) * 100
        : 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/spareparts/customers">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {customer.name}
                            </h1>
                            <Badge className={customerTypeColors[customer.customerType] || ''}>
                                {customer.customerType}
                            </Badge>
                            <Badge variant={customer.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                {customer.status}
                            </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 font-mono text-sm mt-1">
                            {customer.customerNumber} {customer.businessName && `• ${customer.businessName}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/spareparts/customers/${customer.id}/edit`}>
                        <Button variant="outline">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Profile
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Contact Info & Stats */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-500">Phone</p>
                                    <p className="font-medium">{customer.phone}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Email</p>
                                    <p className="font-medium">{customer.email || '-'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-500">Address</p>
                                <p className="font-medium">
                                    {customer.address}
                                    {customer.city && `, ${customer.city}`}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Sales Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium">Lifetime Sales</p>
                                    <p className="text-xl font-bold">{formatCurrency(customer.totalPurchases)}</p>
                                </div>
                                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium">Loyalty Points</p>
                                    <p className="text-xl font-bold">{customer.loyaltyPoints}</p>
                                </div>
                                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                                    <History className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Center & Right: Credit System ("The Book") */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Wallet className="h-5 w-5 text-blue-500" />
                                    Customer Credit
                                </CardTitle>
                                <CardDescription>Managing "{customer.name}'s Book"</CardDescription>
                            </div>
                            <Button>
                                Record Payment (Settle Debt)
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                                <div>
                                    <p className="text-sm text-gray-500">Current Balance (Debt)</p>
                                    <p className={`text-3xl font-bold ${customer.creditBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(customer.creditBalance)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Credit Limit</p>
                                    <p className="text-xl font-medium">{formatCurrency(customer.creditLimit)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Available Credit</p>
                                    <p className="text-xl font-medium text-gray-600">
                                        {formatCurrency(Math.max(0, customer.creditLimit - customer.creditBalance))}
                                    </p>
                                </div>
                            </div>

                            {/* Credit Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Credit Utilization</span>
                                    <span>{creditUtilization.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${creditUtilization > 90 ? 'bg-red-500' : creditUtilization > 75 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                        style={{ width: `${Math.min(creditUtilization, 100)}%` }}
                                    ></div>
                                </div>
                                {creditUtilization > 90 && (
                                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Warning: Close to credit limit
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>Recent credit activities and payments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Placeholder for transactions list - needs API endpoint to fetch */}
                            <div className="text-center py-8 text-gray-500">
                                <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>No transaction history available yet.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
