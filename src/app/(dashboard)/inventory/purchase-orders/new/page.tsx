'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, PlusCircle, Save, Trash2, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useModuleAccess } from '@/hooks/useModulePermissions';

export default function CreatePurchaseOrderPage() {
    const router = useRouter();
    const { canCreate } = useModuleAccess('inventory');

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [vendorId, setVendorId] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [orderNumber, setOrderNumber] = useState('');

    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        if (!canCreate) return;
        const controller = new AbortController();
        const loadInitialData = async () => {
            try {
                const [suppRes, prodRes] = await Promise.all([
                    fetch('/api/inventory/suppliers', { signal: controller.signal }),
                    fetch('/api/inventory/products', { signal: controller.signal })
                ]);
                if (suppRes.ok) {
                    const data = await suppRes.json();
                    setSuppliers(data.data || data || []);
                }
                if (prodRes.ok) {
                    const pData = await prodRes.json();
                    setProducts(pData.data || pData || []);
                }
            } catch (err: any) {
                if (err?.name !== 'AbortError') console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
        return () => controller.abort();
    }, [canCreate]);

    const handleAddItem = () => {
        setItems([...items, { id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: 0 }]);
    };

    const handleUpdateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            newItems[index] = { ...newItems[index], productId: value, unitPrice: product?.costPrice || 0 };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const total = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);

    const handleSubmit = async () => {
        if (!vendorId) return alert('Please select a supplier.');
        if (items.length === 0) return alert('Please add at least one item.');

        // Robust numeric validation
        if (items.some(i => {
            const qty = Number(i.quantity);
            const price = Number(i.unitPrice);
            return !i.productId || isNaN(qty) || !Number.isFinite(qty) || qty <= 0 || isNaN(price) || !Number.isFinite(price) || price <= 0;
        })) {
            return alert('Please complete all item rows with valid quantities and unit prices greater than zero.');
        }

        setIsSubmitting(true);
        try {
            const payload = {
                vendorId,
                expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null,
                orderNumber: orderNumber || undefined,
                subtotal: total,
                tax: 0,
                total: total,
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice)
                }))
            };

            const res = await fetch('/api/inventory/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const created = await res.json();
                router.push(`/inventory/purchase-orders/${created.id}`);
            } else {
                let errorMessage = 'Failed to create Purchase Order';
                try {
                    const text = await res.text();
                    try {
                        const err = JSON.parse(text);
                        errorMessage = err.error || errorMessage;
                    } catch {
                        errorMessage = text || `Error ${res.status}: ${res.statusText}`;
                    }
                } catch {
                    errorMessage = `Error ${res.status}: ${res.statusText}`;
                }
                alert(errorMessage);
            }
        } catch (e) {
            console.error(e);
            alert('An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!canCreate) {
        return <div className="p-8 text-center text-red-500">You do not have permission to create Purchase Orders.</div>;
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50/30">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-[1200px] mx-auto min-h-screen bg-gray-50/30">
            <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                <button onClick={() => router.push('/inventory/purchase-orders')} className="flex items-center hover:text-indigo-600 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Orders
                </button>
                <span>/</span>
                <span className="text-gray-900">New Purchase Order</span>
            </div>

            <div className="flex bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <ShoppingCart className="h-8 w-8 text-indigo-600" />
                        Create Purchase Order
                    </h1>
                    <p className="text-gray-500 mt-1">Draft a new material request to an external vendor.</p>
                </div>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Saving...' : 'Save Purchase Order'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Vendor Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Supplier *</Label>
                            <Select value={vendorId} onValueChange={setVendorId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a supplier..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name || s.companyName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Order Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Expected Delivery Date</Label>
                                <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Custom PO # (Optional)</Label>
                                <Input placeholder="Auto-generated if empty" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Line Items</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleAddItem} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Product
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
                            <TableRow>
                                <TableHead className="w-[400px]">Product</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Unit Cost</TableHead>
                                <TableHead className="text-right border-r border-gray-100">Total</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                                        Click "Add Product" to start building your order.
                                    </TableCell>
                                </TableRow>
                            ) : items.map((item: any, index) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Select value={item.productId} onValueChange={(v) => handleUpdateItem(index, 'productId', v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a product" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name} ({p.sku})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" min="1" value={item.quantity} onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)} className="text-right" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(e) => handleUpdateItem(index, 'unitPrice', e.target.value)} className="text-right" />
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-gray-900 border-r border-gray-100 bg-gray-50/30">
                                        {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => handleRemoveItem(index)} aria-label="Delete item">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {items.length > 0 && (
                        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Total Order Value</p>
                                <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
