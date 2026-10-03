'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingBag, Search, Clock, CreditCard, ChevronRight, CheckCircle2, History, Filter, MoreVertical, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/pos/orders');
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (error) {
            console.error("Failed to load orders", error);
            toast.error("Failed to sync orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const updateStatus = async (orderId: string, status: string) => {
        try {
            const res = await fetch(`/api/pos/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                toast.success(`Order marked as ${status}`);
                fetchOrders();
            }
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-orange-100 text-orange-600 border-orange-200';
            case 'PREPARING': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'READY_TO_SERVE': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
            case 'PAID':
            case 'COMPLETED': return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-slate-100 text-slate-500';
        }
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'ALL' || o.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-4 sm:p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Recent Orders</h1>
                    <p className="text-slate-500 font-medium mt-1 uppercase tracking-wider text-sm flex items-center gap-2">
                        <History className="w-4 h-4" /> Transaction & Prep History
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200 bg-white shadow-sm font-bold">
                        <Filter className="w-4 h-4 mr-2" /> Export Orders
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <Card className="bg-white border-slate-200/50 shadow-xl rounded-[2rem] overflow-hidden border-none">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex flex-wrap gap-2">
                            {['ALL', 'PENDING', 'READY_TO_SERVE', 'PAID'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-bold transition-all",
                                        filterStatus === status
                                            ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105"
                                            : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                    )}
                                >
                                    {status === 'READY_TO_SERVE' ? 'READY' : status}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by Order ID..."
                                className="pl-9 h-11 rounded-xl border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-slate-900/5 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/30 text-slate-400 text-xs uppercase tracking-widest border-b border-slate-100">
                                    <th className="p-6 font-bold">Order ID</th>
                                    <th className="p-6 font-bold">Timestamp</th>
                                    <th className="p-6 font-bold">Items</th>
                                    <th className="p-6 font-bold">Total Bill</th>
                                    <th className="p-6 font-bold">Status</th>
                                    <th className="p-6 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    [1, 2, 3, 4].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="p-4"><div className="h-10 bg-slate-50 rounded-xl" /></td>
                                        </tr>
                                    ))
                                ) : filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center">
                                            <div className="flex flex-col items-center opacity-30">
                                                <ShoppingBag className="w-16 h-16 mb-4" />
                                                <p className="text-xl font-bold">No matching orders found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <motion.tr
                                            key={order.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="group hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td className="p-6">
                                                <span className="font-bold text-slate-900 tracking-tight">#{order.orderNumber.split('-').pop()}</span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="text-xs text-slate-400 font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-wrap gap-1">
                                                    {order.items?.slice(0, 2).map((item: any) => (
                                                        <Badge key={item.id} variant="secondary" className="bg-slate-100/80 text-slate-600 border-none font-medium">
                                                            {item.quantity}x {item.product?.name}
                                                        </Badge>
                                                    ))}
                                                    {order.items?.length > 2 && (
                                                        <span className="text-[10px] text-slate-400 font-bold ml-1 pt-1">+{order.items.length - 2} more</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-extrabold text-slate-900">Rs. {order.total.toLocaleString()}</span>
                                            </td>
                                            <td className="p-6">
                                                <Badge className={cn("border-0 shadow-sm font-bold rounded-lg px-3 py-1", getStatusColor(order.status))}>
                                                    {order.status.replace(/_/g, ' ')}
                                                </Badge>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {order.status === 'READY_TO_SERVE' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => updateStatus(order.id, 'PAID')}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-bold rounded-xl h-9"
                                                        >
                                                            Settle Bill
                                                        </Button>
                                                    )}
                                                    {order.status === 'PENDING' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => updateStatus(order.id, 'PREPARING')}
                                                            className="border-blue-200 text-blue-600 hover:bg-blue-50 font-bold rounded-xl h-9"
                                                        >
                                                            Start Prep
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
