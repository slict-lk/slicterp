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
import { Package, Search, Plus, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [refreshing, setRefreshing] = useState(false);
    
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const res = await fetch(`/api/spareparts/products/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Success', { description: 'Product deleted successfully' });
                fetchProducts();
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            toast.error('Error', { description: 'Failed to delete product' });
        }
    };

    const fetchProducts = useCallback(async () => {
        try {
            setRefreshing(true);
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (categoryFilter !== 'all') params.set('category', categoryFilter);

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
    }, [search, categoryFilter]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchProducts();
        }, 300);
        return () => clearTimeout(debounce);
    }, [fetchProducts]);

    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

    const getStockBadge = (product: Product) => {
        if (product.stockQty === 0) {
            return <Badge variant="destructive">Out of Stock</Badge>;
        } else if (product.stockQty <= product.minStockQty) {
            return <Badge variant="outline" className="text-orange-600 border-orange-600">Low Stock</Badge>;
        } else {
            return <Badge variant="outline" className="text-green-600 border-green-600">In Stock</Badge>;
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
                        <Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        Products
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                        Manage your spare parts inventory
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={fetchProducts} disabled={refreshing} className="w-full sm:w-auto">
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Link href="/spareparts/products/new" className="w-full sm:w-auto">
                        <Button className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat as string}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{products.length} Products</CardTitle>
                    <CardDescription>All spare parts in your catalog</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No products found</p>
                            <Link href="/spareparts/products/new">
                                <Button className="mt-4">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Your First Product
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Stock</TableHead>
                                            <TableHead className="text-right">Min Stock</TableHead>
                                            <TableHead className="text-right">Cost Price</TableHead>
                                            <TableHead className="text-right">Sale Price</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {products.map((product) => (
                                            <TableRow key={product.id}>
                                                <TableCell className="font-medium">{product.sku}</TableCell>
                                                <TableCell>{product.name}</TableCell>
                                                <TableCell>
                                                    {product.category ? (
                                                        <Badge variant="secondary">{product.category}</Badge>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">{product.stockQty}</TableCell>
                                                <TableCell className="text-right">{product.minStockQty}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(Number(product.costPrice))}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(Number(product.salePrice))}
                                                </TableCell>
                                                <TableCell>{getStockBadge(product)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Link href={`/spareparts/products/${product.id}`}>
                                                            <Button variant="ghost" size="sm">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600"
                                                            onClick={() => handleDelete(product.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {products.map((product) => (
                                    <Card key={product.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                                        {product.name}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                                                        {product.sku}
                                                    </p>
                                                    {product.category && (
                                                        <Badge variant="secondary" className="mt-1">
                                                            {product.category}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {getStockBadge(product)}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                                                <div>
                                                    <p className="text-gray-500 text-xs">Stock / Min</p>
                                                    <p className="font-semibold">{product.stockQty} / {product.minStockQty}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Sale Price</p>
                                                    <p className="font-semibold text-primary">
                                                        {formatCurrency(Number(product.salePrice))}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-3 border-t">
                                                <Link href={`/spareparts/products/${product.id}`} className="flex-1">
                                                    <Button variant="outline" size="sm" className="w-full">
                                                        <Edit className="h-4 w-4 mr-1" />
                                                        Edit
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600"
                                                    onClick={() => handleDelete(product.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
