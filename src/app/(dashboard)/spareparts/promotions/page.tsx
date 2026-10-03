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
import { Percent, Plus, RefreshCw, Calendar, Tag, Users } from 'lucide-react';

interface Promotion {
    id: string;
    name: string;
    description: string | null;
    code: string | null;
    type: string;
    discountType: string;
    discountValue: number;
    minimumPurchase: number | null;
    maximumDiscount: number | null;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
    usageCount: number;
    usageLimit: number | null;
    targetType: string;
    _count: { appliedTo: number };
    tiers?: Array<{
        id: string;
        minQuantity: number;
        maxQuantity: number | null;
        discountType: string;
        discountValue: number;
    }>;
}

function formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(date));
}

const typeColors: Record<string, string> = {
    AUTOMATIC: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    CODE: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    COUPON: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

const discountTypeLabels: Record<string, string> = {
    PERCENTAGE: '%',
    FIXED_AMOUNT: 'LKR',
    BUY_X_GET_Y: 'BOGO',
};

export default function PromotionsPage() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPromotions = useCallback(async () => {
        try {
            setRefreshing(true);
            const res = await fetch('/api/spareparts/promotions');
            if (res.ok) {
                const data = await res.json();
                setPromotions(data.promotions || []);
            }
        } catch (error) {
            console.error('Error fetching promotions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchPromotions();
    }, [fetchPromotions]);

    const isExpired = (endDate: string | null) => {
        if (!endDate) return false;
        return new Date(endDate) < new Date();
    };

    const getStatus = (promo: Promotion) => {
        if (!promo.isActive) return { label: 'Inactive', color: 'bg-gray-100 text-gray-700' };
        if (isExpired(promo.endDate)) return { label: 'Expired', color: 'bg-red-100 text-red-700' };
        if (new Date(promo.startDate) > new Date()) return { label: 'Scheduled', color: 'bg-yellow-100 text-yellow-700' };
        return { label: 'Active', color: 'bg-green-100 text-green-700' };
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Percent className="h-8 w-8 text-primary" />
                        Promotions
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage discounts, promo codes, and special offers
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchPromotions} disabled={refreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Link href="/spareparts/promotions/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Promotion
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Tag className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Active Promotions</p>
                            <p className="text-2xl font-bold">{promotions.filter(p => p.isActive && !isExpired(p.endDate)).length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Uses</p>
                            <p className="text-2xl font-bold">{promotions.reduce((sum, p) => sum + p.usageCount, 0)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Scheduled</p>
                            <p className="text-2xl font-bold">{promotions.filter(p => new Date(p.startDate) > new Date()).length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Promotions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Promotions</CardTitle>
                    <CardDescription>
                        {promotions.length} promotions found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            Loading promotions...
                        </div>
                    ) : promotions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Percent className="h-12 w-12 mb-2 opacity-50" />
                            <p>No promotions yet</p>
                            <Link href="/spareparts/promotions/new" className="mt-4">
                                <Button>Create First Promotion</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Promotion</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Discount</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Usage</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {promotions.map((promo) => {
                                        const status = getStatus(promo);
                                        return (
                                            <TableRow key={promo.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {promo.name}
                                                        </p>
                                                        {promo.code && (
                                                            <p className="text-sm text-gray-500 font-mono">
                                                                Code: {promo.code}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={typeColors[promo.type] || ''}>
                                                        {promo.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {promo.type === 'QUANTITY' && promo.tiers && promo.tiers.length > 0 ? (
                                                        <div>
                                                            <p>Tiered</p>
                                                            <p className="text-xs text-gray-500">
                                                                {promo.tiers.length} tier{promo.tiers.length > 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {promo.discountValue}{discountTypeLabels[promo.discountType]}
                                                            {promo.minimumPurchase && (
                                                                <p className="text-xs text-gray-500">
                                                                    Min: LKR {promo.minimumPurchase}
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3 text-gray-400" />
                                                        {formatDate(promo.startDate)}
                                                    </div>
                                                    {promo.endDate && (
                                                        <div className="text-gray-500">
                                                            to {formatDate(promo.endDate)}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {promo.usageCount}
                                                    {promo.usageLimit && ` / ${promo.usageLimit}`}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={status.color}>
                                                        {status.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Link href={`/spareparts/promotions/${promo.id}`}>
                                                        <Button variant="ghost" size="sm">
                                                            Edit
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        );
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
