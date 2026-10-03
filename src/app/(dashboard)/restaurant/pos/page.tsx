'use client';

import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, ChefHat, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type CartItem = { id: string; name: string; price: number; quantity: number; notes?: string; category: string; image?: string; spicyLevel?: number };
type MenuItem = { id: string; name: string; salePrice: number; category: string; description: string; images: string[] };

export default function POSPage() {
    const [activeCategory, setActiveCategory] = useState('All');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isOnline, setIsOnline] = useState(true);

    // Live Data
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>(['All']);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const res = await fetch('/api/restaurant/menu');
                if (res.ok) {
                    const data = await res.json();
                    setMenuItems(data.items || []);

                    const cats = new Set(data.items.map((item: MenuItem) => item.category));
                    setCategories(['All', ...Array.from(cats)] as string[]);
                }
            } catch (error) {
                console.error('Error fetching menu:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMenu();
    }, []);

    const filteredMenu = menuItems.filter(item => {
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, {
                id: item.id,
                name: item.name,
                price: item.salePrice,
                quantity: 1,
                category: item.category,
                image: item.images?.[0]
            }];
        });
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(i => i.id !== itemId));
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => {
            return prev.map(i => {
                if (i.id === itemId) {
                    const newQty = i.quantity + delta;
                    return newQty > 0 ? { ...i, quantity: newQty } : i;
                }
                return i;
            });
        });
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSendOrder = async () => {
        if (cart.length === 0) return;
        setIsSubmitting(true);
        try {
            const payload = {
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    total: item.price * item.quantity
                })),
                subtotal: cartTotal,
                tax: cartTotal * 0.1,
                total: cartTotal * 1.1,
                status: 'PENDING',
                orderNumber: `ORD-${Math.floor(Math.random() * 100000)}`
            };

            const res = await fetch('/api/pos/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                toast.success('Order sent to Kitchen!', {
                    description: `Order #${data.orderNumber} created`,
                    duration: 3000,
                });
                setCart([]);
            } else {
                toast.error('Failed to send order');
            }
        } catch (error) {
            toast.error('Network error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-slate-100 overflow-hidden">

            {/* LEFT: Menu Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header Bar */}
                <div className="bg-white p-4 shadow-sm z-10 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search menu..."
                            className="pl-9 bg-slate-100 border-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="md:hidden">
                        {/* Mobile Cart Trigger */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button className="relative">
                                    <ShoppingCart className="h-5 w-5" />
                                    {cartCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full border-2 border-white">
                                            {cartCount}
                                        </span>
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-full sm:w-[400px] p-0">
                                {/* Reusing Cart Component logic for mobile would ideally be a separate component */}
                                <div className="h-full flex flex-col">
                                    <div className="p-4 bg-slate-50 border-b">
                                        <h2 className="font-bold text-lg flex items-center gap-2">
                                            <ShoppingCart className="h-5 w-5" /> Current Order
                                        </h2>
                                    </div>
                                    <ScrollArea className="flex-1 p-4">
                                        {cart.map(item => (
                                            <div key={item.id} className="flex gap-4 mb-4 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-slate-900">{item.name}</h4>
                                                    <p className="text-sm text-slate-500">Rs. {item.price}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md transition-colors"><Minus className="h-4 w-4" /></button>
                                                        <span className="font-medium text-sm w-4 text-center">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md transition-colors"><Plus className="h-4 w-4" /></button>
                                                    </div>
                                                    <div className="font-bold text-slate-900">Rs. {item.price * item.quantity}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {cart.length === 0 && (
                                            <div className="text-center py-20 text-slate-400">
                                                <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                                <p>Your cart is empty</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                    <div className="p-4 bg-white border-t space-y-4">
                                        <div className="flex justify-between text-xl font-bold">
                                            <span>Total</span>
                                            <span>Rs. {cartTotal.toLocaleString()}</span>
                                        </div>
                                        <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSendOrder} disabled={cart.length === 0}>
                                            Send to Kitchen
                                        </Button>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                    <div className="hidden md:flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
                        <Wifi className="h-3 w-3 mr-1" /> Online
                    </div>
                </div>

                {/* Categories Tabs */}
                <div className="bg-white border-b border-slate-100">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex p-2 gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-medium transition-all",
                                        activeCategory === cat
                                            ? "bg-slate-900 text-white shadow-md transform scale-105"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>

                <ScrollArea className="flex-1 p-4 bg-slate-50">
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                        {loading && <div className="col-span-full text-center py-10 text-slate-500">Loading live menu...</div>}
                        {filteredMenu.map(item => (
                            <motion.div
                                key={item.id}
                                layoutId={item.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => addToCart(item)}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                            >
                                <div className="aspect-[4/3] bg-slate-200 relative overflow-hidden flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {item.images?.[0] ? (
                                        <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <ChefHat className="h-10 w-10 text-slate-400 opacity-50" />
                                    )}
                                </div>
                                <div className="p-3">
                                    <h3 className="font-semibold text-slate-800 line-clamp-1">{item.name}</h3>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-blue-600 font-bold">Rs. {item.salePrice}</span>
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Plus className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* RIGHT: Desktop Cart (Hidden on Mobile) */}
            <div className="hidden md:flex flex-col w-[380px] bg-white border-l border-slate-200 h-full shadow-2xl z-20">
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            <ShoppingBagIcon className="h-5 w-5 text-blue-600" /> Current Order
                        </h2>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">Table 4</Badge>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-4 bg-slate-50/50">
                    <AnimatePresence initial={false}>
                        {cart.map(item => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                className="flex gap-4 mb-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm relative group"
                            >
                                <div className="h-full w-1 bg-blue-500 absolute left-0 top-0 bottom-0 rounded-l-xl"></div>
                                <div className="flex-1 pl-2">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-slate-800 text-sm">{item.name}</h4>
                                        <span className="font-bold text-slate-900 text-sm">Rs.{item.price * item.quantity}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 shadow-inner">
                                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md transition-colors"><Minus className="h-3 w-3 text-slate-600" /></button>
                                            <span className="font-medium text-sm w-6 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md transition-colors"><Plus className="h-3 w-3 text-slate-600" /></button>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="ml-auto text-slate-300 hover:text-red-500 transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {cart.length === 0 && (
                        <div className="text-center py-20 flex flex-col items-center">
                            <div className="h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                <ChefHat className="h-10 w-10 text-blue-200" />
                            </div>
                            <p className="text-slate-400 font-medium">No items selected</p>
                            <p className="text-slate-300 text-sm mt-1">Tap menu items to add them</p>
                        </div>
                    )}
                </ScrollArea>

                <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Subtotal</span>
                            <span>Rs. {cartTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Service Charge (10%)</span>
                            <span>Rs. {(cartTotal * 0.1).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-dashed">
                            <span>Total Pay</span>
                            <span>Rs. {(cartTotal * 1.1).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="w-full border-slate-300 text-slate-600">
                            Draft
                        </Button>
                        <Button
                            size="lg"
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-blue-900/20"
                            onClick={handleSendOrder}
                            disabled={cart.length === 0 || isSubmitting}
                        >
                            {isSubmitting ? 'Sending...' : 'Send to Kitchen'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShoppingBagIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
    )
}
