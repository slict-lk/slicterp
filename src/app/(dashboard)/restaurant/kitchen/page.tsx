"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle2, Flame, User, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type OrderItem = {
    id: string;
    quantity: number;
    unitPrice: number;
    product: {
        name: string;
        category: string;
    }
};

type Ticket = {
    id: string;
    orderNumber: string;
    status: string;
    paymentMethod: string;
    createdAt: string;
    items: OrderItem[];
};

export default function KDSPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('active');

    const fetchTickets = useCallback(async () => {
        try {
            const res = await fetch('/api/pos/orders');
            if (res.ok) {
                const data = await res.json();
                // Today's orders only for performance/clarity if needed, but for now filtering by status
                setTickets(data);
            }
        } catch (error) {
            console.error('Failed to fetch orders', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const filteredTickets = tickets.filter(t => {
        if (activeTab === 'active') return t.status === 'PENDING' || t.status === 'PREPARING';
        if (activeTab === 'ready') return t.status === 'READY_TO_SERVE';
        return false;
    });

    useEffect(() => {
        fetchTickets();

        // Polling for new orders every 10 seconds
        const pollInterval = setInterval(fetchTickets, 10000);

        // Update timer every minute
        const clockInterval = setInterval(() => setCurrentTime(new Date()), 60000);

        return () => {
            clearInterval(pollInterval);
            clearInterval(clockInterval);
        };
    }, [fetchTickets]);

    const getElapsedTime = (startDateStr: string) => {
        const start = new Date(startDateStr);
        const diff = Math.floor((currentTime.getTime() - start.getTime()) / 60000);
        return diff >= 0 ? `${diff}m` : '0m';
    };

    const getUrgencyLevel = (startDateStr: string) => {
        const start = new Date(startDateStr);
        const diff = (currentTime.getTime() - start.getTime()) / 60000;

        if (diff > 20) return {
            color: 'text-red-500',
            bg: 'bg-red-500/10 border-red-500/30',
            badge: 'bg-red-500 hover:bg-red-600',
            icon: <Flame className="h-4 w-4 animate-pulse" />
        };
        if (diff > 10) return {
            color: 'text-orange-500',
            bg: 'bg-orange-500/10 border-orange-500/30',
            badge: 'bg-orange-500 hover:bg-orange-600',
            icon: <Clock className="h-4 w-4" />
        };
        return {
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10 border-emerald-500/30',
            badge: 'bg-emerald-500 hover:bg-emerald-600',
            icon: <CheckCircle2 className="h-4 w-4" />
        };
    };

    const handleBump = async (id: string, targetStatus?: string) => {
        const nextStatus = targetStatus || (activeTab === 'active' ? 'READY_TO_SERVE' : 'COMPLETED');
        try {
            const res = await fetch(`/api/pos/orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });

            if (res.ok) {
                setTickets(prev => prev.filter(t => t.id !== id));
                toast.success(nextStatus === 'COMPLETED' ? 'Order Picked Up' : 'Ticket Bumped');
            } else {
                toast.error('Failed to update status');
            }
        } catch (error) {
            toast.error('Network Error');
        }
    };

    return (
        <div className="p-4 sm:p-8 bg-slate-950 min-h-screen text-slate-100 relative overflow-hidden">
            {/* Background effects for premium feel */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
                        <span className="p-2 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/20 text-white">
                            <UtensilsCrossed className="h-6 w-6" />
                        </span>
                        Command Center
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">
                        Live Kitchen Display • <span className="text-white">{tickets.length} Active Tickets</span>
                    </p>
                </div>

                <div className="flex gap-3 backdrop-blur-md bg-white/5 border border-white/10 p-1 rounded-xl">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[300px]">
                        <TabsList className="w-full bg-transparent text-slate-400 grid grid-cols-2">
                            <TabsTrigger value="active" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Prep Queue</TabsTrigger>
                            <TabsTrigger value="ready" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Ready Station</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Button variant="outline" onClick={fetchTickets} className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white">
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
                <AnimatePresence>
                    {loading && filteredTickets.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-slate-500 font-bold tracking-widest uppercase">Syncing live orders...</div>
                    ) : filteredTickets.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="col-span-full py-32 flex flex-col items-center justify-center text-slate-500 backdrop-blur-xl bg-white/5 border border-white/10 rounded-[3rem]"
                        >
                            <CheckCircle2 className="h-20 w-20 mb-6 opacity-20 text-emerald-400" />
                            <h2 className="text-3xl font-bold opacity-80 text-white mb-2">
                                {activeTab === 'active' ? 'Kitchen is Clear' : 'No Orders Ready'}
                            </h2>
                            <p className="text-lg">
                                {activeTab === 'active' ? 'Waiting for the next rush...' : 'Items waiting for pickup will appear here.'}
                            </p>
                        </motion.div>
                    ) : (
                        filteredTickets.map((ticket, i) => {
                            const urgency = getUrgencyLevel(ticket.createdAt);
                            return (
                                <motion.div
                                    key={ticket.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3, delay: i * 0.05 }}
                                >
                                    <div className={`flex flex-col h-full rounded-2xl backdrop-blur-xl border shadow-2xl overflow-hidden transition-all hover:scale-[1.02] ${urgency.bg}`}>

                                        {/* Ticket Header */}
                                        <div className="p-4 border-b border-white/10 flex justify-between items-start bg-black/20">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-xl text-white tracking-tight">#{ticket.orderNumber.split('-').pop()}</span>
                                                    <Badge className={`border-0 shadow-lg ${urgency.badge}`}>
                                                        {urgency.icon} <span className="ml-1">{getElapsedTime(ticket.createdAt)}</span>
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 text-sm text-slate-400 font-medium">
                                                    <User className="h-4 w-4" /> Walk-in / Table
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ticket Body (Items) */}
                                        <CardContent className="p-5 flex-1 bg-gradient-to-b from-transparent to-black/10">
                                            <ul className="space-y-4">
                                                {ticket.items.map((item, idx) => (
                                                    <li key={item.id} className="flex gap-3 items-start">
                                                        <div className="font-bold text-lg text-white bg-white/10 px-3 py-1 rounded-lg border border-white/5 shadow-inner">
                                                            {item.quantity}x
                                                        </div>
                                                        <div className="flex-1 pt-1">
                                                            <span className="font-semibold text-slate-200 text-lg leading-tight block">
                                                                {item.product?.name || 'Unknown Item'}
                                                            </span>
                                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1 block">
                                                                {item.product?.category || 'General'}
                                                            </span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>

                                        {/* Ticket Footer */}
                                        <div className="p-4 bg-black/40 border-t border-white/10 backdrop-blur-md">
                                            <Button
                                                className={`w-full font-bold h-12 text-lg shadow-lg transition-all rounded-xl border flex items-center justify-center gap-2 ${activeTab === 'ready'
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-400/50 shadow-blue-500/20'
                                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400/50 shadow-emerald-500/20'
                                                    }`}
                                                onClick={() => activeTab === 'ready' ? handleBump(ticket.id) : handleBump(ticket.id)}
                                            >
                                                <CheckCircle2 className="h-6 w-6" />
                                                {activeTab === 'ready' ? 'PICKUP COMPLETED' : 'BUMP TICKET'}
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
