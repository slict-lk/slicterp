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
import { Package, Search, RefreshCw, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    sku: string;
    category: string | null;
    stockQty: number;
    minStockQty: number;
    salePrice: number;
    costPrice: number;
    isActive: boolean;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stockFilter, setStockFilter] = useState<string>('all');
    const [refreshing, setRefreshing] = useState(false);

    const fetchProducts = useCallback(async () => {
        try {
            setRefreshing(true);
            const params = new URLSearchParams();
            if (search) params.set('search', search);

            const res = await fetch(`/api/spareparts/products?${params.toString()}&limit=100`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchProducts();
        }, 300);
        return () => clearTimeout(debounce);
    }, [fetchProducts]);

    const filteredProducts = products.filter(product => {
        if (stockFilter === 'low') return product.stockQty <= product.minStockQty && product.stockQty > 0;
        if (stockFilter === 'out') return product.stockQty === 0;
        if (stockFilter === 'ok') return product.stockQty > product.minStockQty;
        return true;
    });

    const lowStockCount = products.filter(p => p.stockQty <= p.minStockQty && p.stockQty > 0).length;
    const outOfStockCount = products.filter(p => p.stockQty === 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.stockQty * p.costPrice), 0);

    const getStockStatus = (product: Product) => {
        if (product.stockQty === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
        if (product.stockQty <= product.minStockQty) return { label: 'Low Stock', color: 'bg-orange-100 text-orange-700' };
        return { label: 'In Stock', color: 'bg-green-100 text-green-700' };
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Package className="h-8 w-8 text-primary" />
                        Inventory
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Stock levels and inventory management
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchProducts} disabled={refreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Link href="/spareparts/products">
                        <Button variant="outline">
                            Manage Products
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Products</p>
                            <p className="text-2xl font-bold">{products.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                            <TrendingDown className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Low Stock</p>
                            <p className="text-2xl font-bold">{lowStockCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Out of Stock</p>
                            <p className="text-2xl font-bold">{outOfStockCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Stock Value</p>
                            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by name or SKU..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={stockFilter} onValueChange={setStockFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Stock Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Products</SelectItem>
                                <SelectItem value="ok">In Stock</SelectItem>
                                <SelectItem value="low">Low Stock</SelectItem>
                                <SelectItem value="out">Out of Stock</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Stock Levels</CardTitle>
                    <CardDescription>
                        {filteredProducts.length} products
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            Loading inventory...
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Package className="h-12 w-12 mb-2 opacity-50" />
                            <p>No products found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Stock</TableHead>
                                        <TableHead className="text-right">Min Stock</TableHead>
                                        <TableHead className="text-right">Cost</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProducts.map((product) => {
                                        const status = getStockStatus(product);
                                        return (
                                            <TableRow key={product.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {product.name}
                                                        </p>
                                                        <p className="text-sm text-gray-500">{product.sku}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {product.category || '—'}
                                                </TableCell>
                                                <TableCell className={`text-right font-medium ${product.stockQty <= product.minStockQty ? 'text-red-600' : ''
                                                    }`}>
                                                    {product.stockQty}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {product.minStockQty}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(product.costPrice)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(product.salePrice)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={status.color}>
                                                        {status.label}
                                                    </Badge>
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
