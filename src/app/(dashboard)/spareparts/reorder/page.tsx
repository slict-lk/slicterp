"use client";

import { useCallback, useEffect, useState } from 'react';
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
import { RefreshCw, AlertTriangle, Check, X, Package, TrendingDown, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface ReorderSuggestion {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    currentStock: number;
    reorderPoint: number;
    suggestedQty: number;
    avgDailySales: number;
    daysOfStock: number;
    status: string;
    createdAt: string;
}

export default function ReorderPage() {
        const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [generating, setGenerating] = useState(false);

    const fetchSuggestions = useCallback(async () => {
        try {
            setRefreshing(true);
            const res = await fetch('/api/spareparts/reorder');
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.suggestions || []);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    const generateSuggestions = async () => {
        try {
            setGenerating(true);
            const res = await fetch('/api/spareparts/reorder/generate', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                toast.success('Suggestions Generated', { description: `${data.count} new suggestions created` });
                fetchSuggestions();
            }
        } catch (error) {
            toast.error('Error', { description: 'Failed to generate suggestions' });
        } finally {
            setGenerating(false);
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            const res = await fetch(`/api/spareparts/reorder/${id}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: action === 'reject' ? 'Manual rejection' : undefined }),
            });
            if (res.ok) {
                toast.success(action === 'approve' ? 'Approved' : 'Rejected', { description: `Suggestion has been ${action}d` });
                fetchSuggestions();
            }
        } catch (error) {
            toast.error('Error', { description: `Failed to ${action} suggestion` });
        }
    };

    const pendingSuggestions = suggestions.filter(s => s.status === 'PENDING');
    const processedSuggestions = suggestions.filter(s => s.status !== 'PENDING');

    const getStockStatus = (daysOfStock: number | string) => {
        const days = Number(daysOfStock) || 0;
        if (days <= 3) return { label: 'Critical', color: 'bg-red-100 text-red-700' };
        if (days <= 7) return { label: 'Low', color: 'bg-orange-100 text-orange-700' };
        return { label: 'Warning', color: 'bg-yellow-100 text-yellow-700' };
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <ShoppingCart className="h-8 w-8 text-primary" />
                        Auto Reorder
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Review and approve stock replenishment suggestions
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchSuggestions} disabled={refreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={generateSuggestions} disabled={generating}>
                        {generating ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <TrendingDown className="mr-2 h-4 w-4" />
                                Generate Suggestions
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pending Review</p>
                            <p className="text-2xl font-bold">{pendingSuggestions.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900 flex items-center justify-center">
                            <Package className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Critical Stock</p>
                            <p className="text-2xl font-bold">
                                {pendingSuggestions.filter(s => s.daysOfStock <= 3).length}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Processed Today</p>
                            <p className="text-2xl font-bold">{processedSuggestions.length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Suggestions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Pending Suggestions
                    </CardTitle>
                    <CardDescription>
                        Review and approve reorder suggestions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            Loading suggestions...
                        </div>
                    ) : pendingSuggestions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Check className="h-12 w-12 mb-2 opacity-50" />
                            <p>No pending suggestions</p>
                            <p className="text-sm">All stock levels are adequate</p>
                            <Button className="mt-4" variant="outline" onClick={generateSuggestions}>
                                Check for Low Stock
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Current</TableHead>
                                        <TableHead className="text-right">Reorder Point</TableHead>
                                        <TableHead className="text-right">Suggested Qty</TableHead>
                                        <TableHead className="text-right">Avg Daily Sales</TableHead>
                                        <TableHead>Days Left</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingSuggestions.map((suggestion) => {
                                        const stockStatus = getStockStatus(suggestion.daysOfStock);
                                        return (
                                            <TableRow key={suggestion.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {suggestion.productName}
                                                        </p>
                                                        <p className="text-sm text-gray-500">{suggestion.productSku}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-red-600">
                                                    {suggestion.currentStock}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {suggestion.reorderPoint}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-green-600">
                                                    +{suggestion.suggestedQty}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {Number(suggestion.avgDailySales || 0).toFixed(1)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={stockStatus.color}>
                                                        {Math.round(Number(suggestion.daysOfStock) || 0)} days
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            onClick={() => handleAction(suggestion.id, 'approve')}
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleAction(suggestion.id, 'reject')}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
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
