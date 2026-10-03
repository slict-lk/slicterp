"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Save, Loader2, FileText, Plus, Trash2, Search, Percent } from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
    id: string;
    name: string;
    leadTimeDays: number;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    costPrice: number;
    stockQty: number;
    taxCategory?: {
        rate: number;
        name: string;
    };
}

interface OrderItem {
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
}

export default function NewPurchaseOrderPage() {
    const router = useRouter();
        const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<string>('');
    const [expectedDate, setExpectedDate] = useState('');
    const [items, setItems] = useState<OrderItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [notes, setNotes] = useState('');
    const [isTaxEnabled, setIsTaxEnabled] = useState(false);

    const fetchSuppliers = useCallback(async () => {
        const res = await fetch('/api/spareparts/suppliers');
        if (res.ok) {
            const data = await res.json();
            setSuppliers(data.suppliers || []);
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        const res = await fetch(`/api/spareparts/products?search=${searchTerm}&limit=20`);
        if (res.ok) {
            const data = await res.json();
            setProducts(data.products || []);
        }
    }, [searchTerm]);

    useEffect(() => {
        fetchSuppliers();
        fetchProducts();
    }, [fetchSuppliers, fetchProducts]);

    // Recalculate taxes when tax enabled status changes
    useEffect(() => {
        setItems(prevItems => prevItems.map(item => {
            const taxRate = isTaxEnabled ? item.taxRate : 0;
            // Retrieve original tax rate from product if possible? 
            // Actually, we stored the taxRate in the item when adding.
            // But if we toggle OFF, we want tax to be 0.
            // If we toggle ON, we want to restore the product's tax rate.
            // Problem: We lost the product's original rate if we set it to 0.

            // Better approach: Store 'originalTaxRate' or just re-fetch/re-calculate based on product memory?
            // To keep it simple: We won't support dynamic toggling perfectly without product lookup.
            // Let's rely on finding the product in the 'products' list or just re-adding.
            // OR: Store 'productTaxRate' in item and use it to calc 'taxAmount' dynamically.

            return item; // We will handle calculation in render/submit mainly?
            // No, 'lineTotal' is stored.
            // Let's update `addItem` to store `productTaxRate`.
        }));
    }, [isTaxEnabled]);

    const addItem = (product: Product) => {
        // Determine tax rate
        const productTaxRate = product.taxCategory?.rate || 0;

        const existing = items.find(i => i.productId === product.id);
        if (existing) {
            // Update existing
            const newQty = existing.quantity + 1;
            recalculateItem(existing.productId, newQty, existing.unitPrice, productTaxRate);
        } else {
            // Add new
            const quantity = 1;
            const unitPrice = Number(product.costPrice);

            const effectiveTaxRate = isTaxEnabled ? productTaxRate : 0;
            const lineSubtotal = quantity * unitPrice;
            const taxAmount = (lineSubtotal * effectiveTaxRate) / 100;
            const lineTotal = lineSubtotal + taxAmount;

            setItems([...items, {
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                quantity,
                unitPrice,
                taxRate: productTaxRate, // Store the PRODUCT'S rate permanently
                taxAmount,
                lineTotal,
            }]);
        }
    };

    const recalculateItem = (productId: string, quantity: number, unitPrice: number, baseTaxRate: number) => {
        const effectiveTaxRate = isTaxEnabled ? baseTaxRate : 0;
        const lineSubtotal = quantity * unitPrice;
        const taxAmount = (lineSubtotal * effectiveTaxRate) / 100;
        const lineTotal = lineSubtotal + taxAmount;

        setItems(prev => prev.map(i =>
            i.productId === productId
                ? { ...i, quantity, unitPrice, taxAmount, lineTotal, taxRate: baseTaxRate }
                : i
        ));
    };

    // Use effect to recalculate ALL items when isTaxEnabled changes
    useEffect(() => {
        setItems(prev => prev.map(item => {
            const effectiveTaxRate = isTaxEnabled ? item.taxRate : 0;
            const lineSubtotal = item.quantity * item.unitPrice;
            const taxAmount = (lineSubtotal * effectiveTaxRate) / 100;
            const lineTotal = lineSubtotal + taxAmount;
            return { ...item, taxAmount, lineTotal };
        }));
    }, [isTaxEnabled]);

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeItem(productId);
            return;
        }
        const item = items.find(i => i.productId === productId);
        if (item) {
            recalculateItem(productId, quantity, item.unitPrice, item.taxRate);
        }
    };

    const removeItem = (productId: string) => {
        setItems(items.filter(i => i.productId !== productId));
    };

    const subtotal = items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
    const totalTax = items.reduce((sum, i) => sum + i.taxAmount, 0);
    const total = subtotal + totalTax;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplier || items.length === 0) {
            toast.error('Error', { description: 'Please select a supplier and add items' });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/spareparts/purchases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierId: selectedSupplier,
                    expectedDate: expectedDate || null,
                    notes,
                    isTaxEnabled,
                    items: items.map(i => ({
                        productId: i.productId,
                        productName: i.productName,
                        productSku: i.productSku,
                        quantity: i.quantity,
                        unitPrice: i.unitPrice,
                        // taxRate/Amount will be recalculated on backend to be safe
                    })),
                }),
            });

            if (res.ok) {
                toast.success('Success', { description: 'Purchase order created successfully' });
                router.push('/spareparts/purchases');
            } else {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create order');
            }
        } catch (error: unknown) {
            toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to create order' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <Link href="/spareparts/purchases">
                    <Button variant="ghost" size="sm" className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Orders
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    New Purchase Order
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Create a purchase order for your supplier
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Order Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Supplier *</Label>
                                        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select supplier" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {suppliers.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Expected Delivery</Label>
                                        <Input
                                            type="date"
                                            value={expectedDate}
                                            onChange={(e) => setExpectedDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Switch
                                        id="tax-mode"
                                        checked={isTaxEnabled}
                                        onCheckedChange={setIsTaxEnabled}
                                    />
                                    <Label htmlFor="tax-mode">Enable VAT / Tax Calculation</Label>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Add Products */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Add Products</CardTitle>
                                <CardDescription>Search and add products to the order</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search products..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {products.slice(0, 10).map(product => (
                                        <div
                                            key={product.id}
                                            className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                                            onClick={() => addItem(product)}
                                        >
                                            <div>
                                                <p className="font-medium">{product.name}</p>
                                                <p className="text-sm text-gray-500">{product.sku} • Stock: {product.stockQty}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {product.taxCategory && (
                                                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                                                        {product.taxCategory.rate}% VAT
                                                    </span>
                                                )}
                                                <span className="font-medium">LKR {Number(product.costPrice).toLocaleString()}</span>
                                                <Button type="button" size="sm" variant="ghost">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Order Items */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Items</CardTitle>
                                <CardDescription>{items.length} items in order</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {items.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No items added yet</p>
                                        <p className="text-sm">Search and add products above</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead className="text-right">Unit Price</TableHead>
                                                <TableHead className="text-center">Quantity</TableHead>
                                                {isTaxEnabled && <TableHead className="text-right">Tax</TableHead>}
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map(item => (
                                                <TableRow key={item.productId}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{item.productName}</p>
                                                            <p className="text-sm text-gray-500">{item.productSku}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        LKR {item.unitPrice.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
                                                            className="w-20 text-center mx-auto"
                                                        />
                                                    </TableCell>
                                                    {isTaxEnabled && (
                                                        <TableCell className="text-right text-sm text-gray-600">
                                                            <div>LKR {item.taxAmount.toLocaleString()}</div>
                                                            <div className="text-xs opacity-75">({item.taxRate}%)</div>
                                                        </TableCell>
                                                    )}
                                                    <TableCell className="text-right font-medium">
                                                        LKR {item.lineTotal.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-600"
                                                            onClick={() => removeItem(item.productId)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Summary */}
                    <div>
                        <Card className="sticky top-6">
                            <CardHeader>
                                <CardTitle>Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Items</span>
                                        <span>{items.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Subtotal</span>
                                        <span>LKR {subtotal.toLocaleString()}</span>
                                    </div>
                                    {isTaxEnabled && (
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Tax (VAT)</span>
                                            <span>LKR {totalTax.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="border-t pt-2 flex justify-between font-bold">
                                        <span>Total</span>
                                        <span>LKR {total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Add notes..."
                                        className="w-full h-24 px-3 py-2 border rounded-md text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={loading || !selectedSupplier || items.length === 0}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Create Order
                                            </>
                                        )}
                                    </Button>
                                    <Link href="/spareparts/purchases" className="block">
                                        <Button type="button" variant="outline" className="w-full">
                                            Cancel
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
