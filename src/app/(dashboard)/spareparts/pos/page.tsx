"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    ShoppingBag,
    Search,
    Plus,
    Minus,
    Trash2,
    User,
    CreditCard,
    Banknote,
    Building2,
    X,
    Check,
    Loader2,
    Tag,
    Percent,
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
    id: string;
    name: string;
    sku: string;
    salePrice: number;
    costPrice: number;
    stockQty: number;
    category: string | null;
    taxCategory?: {
        id: string;
        name: string;
        rate: number;
    } | null;
}

interface CartItem {
    product: Product;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
}

interface Customer {
    id: string;
    customerNumber: string;
    name: string;
    phone: string;
    customerType: string;
}

interface Promotion {
    id: string;
    name: string;
    description?: string;
    code?: string;
    type: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    minimumPurchase?: number | null;
    minQuantity?: number;
    productId?: string;
    productName?: string;
    source: 'ORDER' | 'QUANTITY';
}

interface AppliedPromotion {
    promotionId: string;
    name: string;
    discountAmount: number;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function POSPage() {
    const router = useRouter();
    
    // State
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [showCustomerDialog, setShowCustomerDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [showMobileCart, setShowMobileCart] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
    const [cashReceived, setCashReceived] = useState('');
    const [isTaxEnabled, setIsTaxEnabled] = useState(true);
    const [availablePromotions, setAvailablePromotions] = useState<Promotion[]>([]);
    const [appliedPromotions, setAppliedPromotions] = useState<AppliedPromotion[]>([]);

    // Calculations - taxes are calculated per item based on each product's tax category
    const subtotal = cart.reduce((sum, item) => {
        const itemSubtotal = item.unitPrice * item.quantity * (1 - item.discountPercent / 100);
        return sum + itemSubtotal;
    }, 0);
    const taxAmount = isTaxEnabled ? cart.reduce((sum, item) => sum + item.taxAmount, 0) : 0;
    const promoDiscount = appliedPromotions.reduce((sum, p) => sum + p.discountAmount, 0);
    const total = subtotal + taxAmount - promoDiscount;
    const change = parseFloat(cashReceived) - total;

    // Fetch products
    const fetchProducts = useCallback(async () => {
        try {
            const res = await fetch(`/api/spareparts/products?search=${searchQuery}&limit=50`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    }, [searchQuery]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchProducts();
        }, 300);
        return () => clearTimeout(debounce);
    }, [fetchProducts]);

    // Fetch tax configuration
    useEffect(() => {
        const fetchTaxConfig = async () => {
            try {
                const res = await fetch('/api/spareparts/config/tax');
                if (res.ok) {
                    const data = await res.json();
                    setIsTaxEnabled(data.isTaxEnabled ?? true);
                }
            } catch (error) {
                console.error('Error fetching tax config:', error);
            }
        };
        fetchTaxConfig();
    }, []);

    // Fetch available promotions when cart changes
    useEffect(() => {
        const fetchPromotions = async () => {
            if (cart.length === 0) {
                setAvailablePromotions([]);
                setAppliedPromotions([]);
                return;
            }

            try {
                const res = await fetch('/api/spareparts/promotions/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: cart.map(item => ({
                            productId: item.product.id,
                            productName: item.product.name,
                            category: item.product.category,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice
                        })),
                        customerId: selectedCustomer?.id || null
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    setAvailablePromotions(data.promotions || []);
                    // Remove any applied promotions that are no longer valid
                    setAppliedPromotions(prev =>
                        prev.filter(ap => data.promotions.some((p: Promotion) => p.id === ap.promotionId))
                    );
                }
            } catch (error) {
                console.error('Error fetching promotions:', error);
            }
        };

        const debounce = setTimeout(fetchPromotions, 500);
        return () => clearTimeout(debounce);
    }, [cart, selectedCustomer]);

    // Apply a promotion
    const applyPromotion = (promo: Promotion) => {
        if (appliedPromotions.some(ap => ap.promotionId === promo.id)) {
            toast.error('Already Applied', { description: `${promo.name} is already applied` });
            return;
        }

        setAppliedPromotions(prev => [
            ...prev,
            {
                promotionId: promo.id,
                name: promo.name,
                discountAmount: promo.discountAmount
            }
        ]);

        toast.success('Promotion Applied', { description: `${promo.name} - ${formatCurrency(promo.discountAmount)} off` });
    };

    // Remove a promotion
    const removePromotion = (promotionId: string) => {
        setAppliedPromotions(prev => prev.filter(ap => ap.promotionId !== promotionId));
    };

    // Search customers
    const searchCustomers = useCallback(async () => {
        if (customerSearch.length < 2) {
            setCustomers([]);
            return;
        }
        try {
            const res = await fetch(`/api/spareparts/customers?search=${customerSearch}`);
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.customers || []);
            }
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    }, [customerSearch]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            searchCustomers();
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchCustomers]);

    // Add to cart
    const addToCart = (product: Product) => {
        // Check if product is out of stock
        if (product.stockQty <= 0) {
            toast.error('Out of Stock', { description: `${product.name} is currently out of stock` });
            return;
        }

        const existing = cart.find((item) => item.product.id === product.id);

        // Check if adding another would exceed available stock
        if (existing && existing.quantity >= product.stockQty) {
            toast.error('Insufficient Stock', { description: `Only ${product.stockQty} units available` });
            return;
        }

        // Get tax rate from product's tax category
        const productTaxRate = isTaxEnabled && product.taxCategory ? Number(product.taxCategory.rate) : 0;

        if (existing) {
            setCart((prev) =>
                prev.map((item) => {
                    if (item.product.id === product.id) {
                        const newQty = item.quantity + 1;
                        const subtotal = newQty * Number(item.unitPrice) * (1 - item.discountPercent / 100);
                        const itemTaxAmount = isTaxEnabled ? (subtotal * item.taxRate) / 100 : 0;
                        return {
                            ...item,
                            quantity: newQty,
                            taxAmount: itemTaxAmount,
                            lineTotal: subtotal,
                        };
                    }
                    return item;
                })
            );
        } else {
            const unitPrice = Number(product.salePrice);
            const subtotal = unitPrice; // qty = 1, no discount
            const itemTaxAmount = isTaxEnabled ? (subtotal * productTaxRate) / 100 : 0;

            setCart((prev) => [
                ...prev,
                {
                    product,
                    quantity: 1,
                    unitPrice,
                    discountPercent: 0,
                    taxRate: productTaxRate,
                    taxAmount: itemTaxAmount,
                    lineTotal: subtotal,
                },
            ]);
        }
    };

    // Update quantity
    const updateQuantity = (productId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.product.id === productId) {
                        const newQty = Math.max(0, item.quantity + delta);

                        // Check stock limit when incrementing
                        if (delta > 0 && newQty > item.product.stockQty) {
                            toast.error('Insufficient Stock', { description: `Only ${item.product.stockQty} units available` });
                            return item; // Don't update quantity
                        }

                        const subtotal = newQty * Number(item.unitPrice) * (1 - item.discountPercent / 100);
                        const itemTaxAmount = isTaxEnabled ? (subtotal * item.taxRate) / 100 : 0;

                        return {
                            ...item,
                            quantity: newQty,
                            taxAmount: itemTaxAmount,
                            lineTotal: subtotal,
                        };
                    }
                    return item;
                })
                .filter((item) => item.quantity > 0)
        );
    };

    // Remove from cart
    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    // Clear cart
    const clearCart = () => {
        setCart([]);
        setSelectedCustomer(null);
        setCashReceived('');
        setPaymentMethod('CASH');
        setAppliedPromotions([]);
    };

    // Process sale
    const processSale = async () => {
        if (cart.length === 0) {
            toast.error('Empty Cart', { description: 'Please add items to the cart' });
            return;
        }

        try {
            setProcessing(true);

            // Create invoice
            const invoiceRes = await fetch('/api/spareparts/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: selectedCustomer?.id,
                    customerName: selectedCustomer?.name,
                    customerPhone: selectedCustomer?.phone,
                }),
            });

            if (!invoiceRes.ok) {
                const error = await invoiceRes.json();
                throw new Error(error.error || 'Failed to create invoice');
            }
            const invoice = await invoiceRes.json();
            console.log('Invoice created:', invoice);

            // Add items - check each response
            for (const item of cart) {
                console.log('Adding item:', item.product.name);
                const itemRes = await fetch(`/api/spareparts/sales/${invoice.id}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: item.product.id,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discountPercent: item.discountPercent,
                    }),
                });

                if (!itemRes.ok) {
                    const error = await itemRes.json();
                    console.error('Failed to add item:', error);
                    throw new Error(`Failed to add ${item.product.name}: ${error.error || 'Unknown error'}`);
                }
                const addedItem = await itemRes.json();
                console.log('Item added successfully:', addedItem);
            }

            // Confirm invoice
            console.log('Confirming invoice...');
            const confirmRes = await fetch(`/api/spareparts/sales/${invoice.id}/confirm`, {
                method: 'POST',
            });

            if (!confirmRes.ok) {
                const error = await confirmRes.json();
                throw new Error(error.error || 'Failed to confirm invoice');
            }
            console.log('Invoice confirmed');

            // Record payment
            console.log('Recording payment...');
            const paymentRes = await fetch(`/api/spareparts/sales/${invoice.id}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: total,
                    method: paymentMethod,
                    reference: paymentMethod === 'CASH' ? `Cash: ${formatCurrency(parseFloat(cashReceived))}` : undefined,
                }),
            });

            if (!paymentRes.ok) {
                const error = await paymentRes.json();
                console.error('Failed to record payment:', error);
                // Don't throw here - invoice is already created and confirmed
            } else {
                console.log('Payment recorded');
            }

            toast.success('Sale Complete', { description: `Invoice ${invoice.invoiceNumber} has been created.` });

            setShowPaymentDialog(false);
            clearCart();
            router.push(`/spareparts/sales/${invoice.id}`);
        } catch (error: any) {
            console.error('Error processing sale:', error);
            toast.error('Error', { description: error.message || 'Failed to process sale' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    <span className="hidden sm:inline">Point of Sale</span>
                    <span className="sm:hidden">POS</span>
                </h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push('/spareparts')}>
                        <X className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Exit POS</span>
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Product Grid */}
                <div className="flex-1 p-4 overflow-y-auto">
                    {/* Enhanced Product Search */}
                    <div className="mb-4 space-y-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="🔍 Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white dark:bg-gray-800 h-10 sm:h-12 text-base sm:text-lg"
                                autoFocus
                            />
                        </div>

                        {/* Product Dropdown Results */}
                        {searchQuery && products.length > 0 && (
                            <Card className="absolute z-50 left-4 right-4 md:max-w-4xl shadow-xl border-2 border-primary/20">
                                <CardContent className="p-0 max-h-96 overflow-y-auto">
                                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b sticky top-0">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Found {products.length} products • Click to add to cart
                                        </p>
                                    </div>
                                    {products.map((product) => (
                                        <div
                                            key={product.id}
                                            className="flex items-center justify-between p-3 hover:bg-primary/5 border-b cursor-pointer transition-colors"
                                            onClick={() => {
                                                addToCart(product);
                                                setSearchQuery('');
                                            }}
                                        >
                                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <span className="text-lg sm:text-xl">📦</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">
                                                        {product.name}
                                                    </h4>
                                                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                                                        <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded truncate">
                                                            {product.sku}
                                                        </span>
                                                        {product.category && (
                                                            <span className="text-blue-600 dark:text-blue-400 truncate hidden sm:inline">
                                                                📁 {product.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-4 text-right flex-shrink-0">
                                                <div className="hidden sm:block">
                                                    <p className="font-bold text-base sm:text-lg text-primary">
                                                        {formatCurrency(product.salePrice)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Cost: {formatCurrency(product.costPrice)}
                                                    </p>
                                                </div>
                                                <div className="sm:hidden">
                                                    <p className="font-bold text-sm text-primary">
                                                        {formatCurrency(product.salePrice)}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={product.stockQty > 10 ? 'default' : product.stockQty > 0 ? 'secondary' : 'destructive'}
                                                    className="min-w-[50px] sm:min-w-[60px] justify-center text-xs"
                                                >
                                                    {product.stockQty > 0 ? `${product.stockQty}` : '0'}
                                                </Badge>
                                                <Button size="sm" variant="ghost" className="text-green-600 hidden sm:flex">
                                                    <Plus className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Product Grid - Shows when not searching */}
                    {!searchQuery && (
                        <>
                            <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-3">All Products</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                                {products.map((product) => (
                                    <Card
                                        key={product.id}
                                        className={`cursor-pointer hover:shadow-md transition-all hover:border-primary ${product.stockQty === 0 ? 'opacity-50' : ''
                                            }`}
                                        onClick={() => addToCart(product)}
                                    >
                                        <CardContent className="p-2 sm:p-3">
                                            <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-center relative">
                                                <span className="text-xl sm:text-2xl text-gray-400">📦</span>
                                                {product.stockQty <= 5 && product.stockQty > 0 && (
                                                    <span className="absolute top-1 right-1 text-orange-500 text-xs">⚠️</span>
                                                )}
                                            </div>
                                            <h3 className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                                {product.name}
                                            </h3>
                                            <p className="text-[10px] sm:text-xs text-gray-500 truncate font-mono">{product.sku}</p>
                                            {product.category && (
                                                <p className="text-[10px] sm:text-xs text-blue-500 truncate">{product.category}</p>
                                            )}
                                            <div className="flex items-center justify-between mt-1 sm:mt-2">
                                                <span className="font-bold text-xs sm:text-sm text-primary truncate">
                                                    {formatCurrency(product.salePrice)}
                                                </span>
                                                <Badge variant={product.stockQty > 0 ? 'default' : 'destructive'} className="text-[10px] sm:text-xs px-1">
                                                    {product.stockQty}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}

                    {products.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Search className="h-12 w-12 mb-2 opacity-50" />
                            <p>No products found</p>
                            <p className="text-sm">Try searching with a different term</p>
                        </div>
                    )}
                </div>

                {/* Cart Panel - Hidden on mobile by default, shown on larger screens */}
                <div className="hidden lg:flex lg:w-96 bg-white dark:bg-gray-800 border-l flex-col">
                    {/* Customer Selection */}
                    <div className="p-4 border-b">
                        {selectedCustomer ? (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-primary/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                        {selectedCustomer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {selectedCustomer.name}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="font-mono">{selectedCustomer.customerNumber}</span>
                                            <span>•</span>
                                            <span>{selectedCustomer.phone}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="text-xs">{selectedCustomer.customerType}</Badge>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCustomer(null);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full justify-start h-12 border-dashed"
                                onClick={() => setShowCustomerDialog(true)}
                            >
                                <User className="h-4 w-4 mr-2" />
                                <span className="text-gray-500">Select Customer (Optional)</span>
                            </Button>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <ShoppingBag className="h-12 w-12 mb-2 opacity-50" />
                                <p>Cart is empty</p>
                                <p className="text-sm">Click products to add</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <div
                                        key={item.product.id}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                {item.product.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatCurrency(item.unitPrice)} × {item.quantity}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => updateQuantity(item.product.id, -1)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => updateQuantity(item.product.id, 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm">{formatCurrency(item.lineTotal)}</p>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-500 hover:text-red-700"
                                                onClick={() => removeFromCart(item.product.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Available Promotions */}
                    {availablePromotions.length > 0 && (
                        <div className="border-t p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                            <div className="flex items-center gap-2 mb-2">
                                <Tag className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                    Available Promotions
                                </span>
                            </div>
                            <div className="space-y-2">
                                {availablePromotions
                                    .filter(p => !appliedPromotions.some(ap => ap.promotionId === p.id))
                                    .map((promo) => (
                                        <div
                                            key={promo.id}
                                            className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 cursor-pointer hover:border-green-400 transition-colors"
                                            onClick={() => applyPromotion(promo)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{promo.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {promo.source === 'ORDER'
                                                        ? `${promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% off` : formatCurrency(promo.discountValue) + ' off'}`
                                                        : `Qty ${promo.minQuantity}+ - ${promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : formatCurrency(promo.discountValue)}`
                                                    }
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-green-600">
                                                    -{formatCurrency(promo.discountAmount)}
                                                </span>
                                                <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600">
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Applied Promotions */}
                    {appliedPromotions.length > 0 && (
                        <div className="border-t p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                            <div className="flex items-center gap-2 mb-2">
                                <Percent className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                                    Applied Discounts
                                </span>
                            </div>
                            <div className="space-y-1">
                                {appliedPromotions.map((ap) => (
                                    <div
                                        key={ap.promotionId}
                                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800"
                                    >
                                        <span className="text-sm truncate">{ap.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-purple-600">
                                                -{formatCurrency(ap.discountAmount)}
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                onClick={() => removePromotion(ap.promotionId)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Totals & Actions */}
                    <div className="border-t p-4 space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {taxAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Tax</span>
                                    <span>{formatCurrency(taxAmount)}</span>
                                </div>
                            )}
                            {promoDiscount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(promoDiscount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold pt-1 border-t">
                                <span>Total</span>
                                <span className="text-primary">{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" onClick={clearCart} disabled={cart.length === 0}>
                                Clear Cart
                            </Button>
                            <Button
                                onClick={() => setShowPaymentDialog(true)}
                                disabled={cart.length === 0}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Pay
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Dialog */}
            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Select Customer
                        </DialogTitle>
                        <DialogDescription>
                            Search for an existing customer by name, phone, or customer number
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="🔍 Search by name, phone, email, or customer number..."
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                className="pl-10 h-12"
                                autoFocus
                            />
                        </div>

                        {customerSearch.length >= 2 && customers.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No customers found matching "{customerSearch}"</p>
                                <p className="text-sm">Try a different search term</p>
                            </div>
                        )}

                        {customerSearch.length < 2 && (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                Type at least 2 characters to search customers
                            </div>
                        )}

                        <div className="max-h-80 overflow-y-auto space-y-2">
                            {customers.map((customer) => (
                                <div
                                    key={customer.id}
                                    className="flex items-center justify-between p-4 rounded-xl border-2 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all"
                                    onClick={() => {
                                        setSelectedCustomer(customer);
                                        setShowCustomerDialog(false);
                                        setCustomerSearch('');
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                            {customer.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white text-lg">
                                                {customer.name}
                                            </p>
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
                                                    {customer.customerNumber}
                                                </span>
                                                <span>📞 {customer.phone}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge className={
                                            customer.customerType === 'REGULAR' ? 'bg-blue-100 text-blue-700' :
                                                customer.customerType === 'VIP' ? 'bg-purple-100 text-purple-700' :
                                                    customer.customerType === 'WHOLESALE' ? 'bg-green-100 text-green-700' :
                                                        'bg-gray-100 text-gray-700'
                                        }>
                                            {customer.customerType}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCustomerDialog(false);
                                setCustomerSearch('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setSelectedCustomer(null);
                                setShowCustomerDialog(false);
                            }}
                        >
                            <User className="h-4 w-4 mr-2" />
                            Continue as Walk-in
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Payment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-1 text-sm border-b pb-4 mb-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {taxAmount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax:</span>
                                <span>+{formatCurrency(taxAmount)}</span>
                            </div>
                        )}
                        {promoDiscount > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Discount:</span>
                                <span>-{formatCurrency(promoDiscount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-1 border-t">
                            <span>Total:</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">
                                        <div className="flex items-center gap-2">
                                            <Banknote className="h-4 w-4" />
                                            Cash
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="CARD">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-4 w-4" />
                                            Card
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="BANK_TRANSFER">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4" />
                                            Bank Transfer
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {paymentMethod === 'CASH' && (
                            <div className="space-y-2">
                                <Label>Cash Received</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={cashReceived}
                                    onChange={(e) => setCashReceived(e.target.value)}
                                    placeholder="Enter amount received"
                                    autoFocus
                                />
                                {cashReceived && parseFloat(cashReceived) > 0 && (
                                    <>
                                        {parseFloat(cashReceived) >= total ? (
                                            <div className="flex justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300">
                                                <span>Change</span>
                                                <span className="font-bold">{formatCurrency(change)}</span>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300">
                                                <span>Insufficient</span>
                                                <span className="font-bold">Need {formatCurrency(total - parseFloat(cashReceived))}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={processSale}
                            disabled={processing || (paymentMethod === 'CASH' && parseFloat(cashReceived) < total)}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Complete Sale
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mobile Cart Dialog */}
            <Dialog open={showMobileCart} onOpenChange={setShowMobileCart}>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Shopping Cart ({cart.length} items)</DialogTitle>
                    </DialogHeader>

                    {/* Customer Selection - Mobile */}
                    <div className="space-y-3">
                        {selectedCustomer ? (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-primary/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                        {selectedCustomer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                            {selectedCustomer.name}
                                        </p>
                                        <p className="text-xs text-gray-500">{selectedCustomer.customerType}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedCustomer(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => {
                                    setShowMobileCart(false);
                                    setShowCustomerDialog(true);
                                }}
                            >
                                <User className="h-4 w-4 mr-2" />
                                Select Customer (Optional)
                            </Button>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                        {cart.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">Cart is empty</p>
                        ) : (
                            cart.map((item, index) => (
                                <div key={index} className="flex items-start gap-2 p-2 border rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                                        <p className="text-xs text-gray-500">{item.product.sku}</p>
                                        <p className="text-sm font-semibold text-primary mt-1">
                                            {formatCurrency(item.lineTotal)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateQuantity(item.product.id, -1)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-sm font-medium w-8 text-center">
                                            {item.quantity}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateQuantity(item.product.id, 1)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeFromCart(item.product.id)}
                                            className="h-8 w-8 p-0 text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Cart Summary */}
                    <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-semibold">{formatCurrency(subtotal)}</span>
                        </div>
                        {taxAmount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tax:</span>
                                <span className="font-semibold">{formatCurrency(taxAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total:</span>
                            <span className="text-primary">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setCart([])}
                            className="flex-1"
                            disabled={cart.length === 0}
                        >
                            Clear Cart
                        </Button>
                        <Button
                            onClick={() => {
                                setShowMobileCart(false);
                                setShowPaymentDialog(true);
                            }}
                            className="flex-1"
                            disabled={cart.length === 0}
                        >
                            <Check className="h-4 w-4 mr-2" />
                            Checkout
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Mobile Cart FAB (Floating Action Button) - Moved up to avoid AI button overlap */}
            <div className="lg:hidden fixed bottom-24 right-6 z-50">
                <Button
                    onClick={() => setShowMobileCart(true)}
                    className="h-14 w-14 rounded-full shadow-lg relative p-0 flex items-center justify-center"
                >
                    <ShoppingBag className="h-6 w-6 text-white" />
                    {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                            {cart.length}
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
}
