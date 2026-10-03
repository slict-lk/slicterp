"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Users, Search, RefreshCw, Check, X, ArrowRight, MapPin,
    TrendingUp, Filter, Clock, DollarSign, Activity, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// --- Types ---
interface Customer {
    id: string;
    name: string;
    email: string;
    country: string | null;
}

interface Bid {
    id: string;
    requestedMake: string | null;
    requestedModel: string | null;
    maxBudget: number | null;
    currency: string;
    notes: string | null;
    status: string;
    adminNotes: string | null;
    createdAt: string;
    customer: Customer;
    vehicle: { id: string; stockNumber: string; make: string; model: string } | null;
}

// --- Motion Variants ---
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

// --- Styles ---
const GLASS_CARD = "bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-sm";
const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800',
    APPROVED: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800',
    REJECTED: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
    WON: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
    LOST: 'bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800',
};

function formatCurrency(amount: number | null, currency: string = 'JPY'): string {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(dateStr));
}

export default function BidsPage() {
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
    const [processing, setProcessing] = useState(false);
    
    // Stats
    const stats = {
        total: bids.length,
        pending: bids.filter(b => b.status === 'PENDING').length,
        todayValue: bids
            .filter(b => new Date(b.createdAt).toDateString() === new Date().toDateString())
            .reduce((acc, curr) => acc + (curr.maxBudget || 0), 0)
    };

    const fetchBids = useCallback(async () => {
        try {
            setRefreshing(true);
            const params = new URLSearchParams();
            if (filter !== 'all') params.set('status', filter);

            const res = await fetch(`/api/vehicle-export/bids?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setBids(data.bids || []);
            }
        } catch (error) {
            console.error('Error fetching bids:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchBids();
    }, [fetchBids]);

    const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
        if (!selectedBid) return;
        setProcessing(true);
        try {
            const res = await fetch(`/api/vehicle-export/bids/${selectedBid.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    adminNotes: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} by sales team via Command Center`,
                }),
            });
            if (res.ok) {
                toast.success(`Bid ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`, { description: `The bid has been processed successfully.` });
                fetchBids();
                setSelectedBid(null);
            }
        } catch (error) {
            toast.error('Error', { description: 'Failed to update bid' });
        } finally {
            setProcessing(false);
        }
    };

    const filteredBids = bids.filter(bid => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            bid.customer.name.toLowerCase().includes(searchLower) ||
            bid.requestedMake?.toLowerCase().includes(searchLower) ||
            bid.requestedModel?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="min-h-screen p-4 sm:p-8 space-y-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">

            {/* Header Area */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        Sales Command Center
                    </h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-500" />
                        Live Bid Stream
                    </p>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={fetchBids}
                        disabled={refreshing}
                        className={cn("border-gray-200 dark:border-gray-800", refreshing && "opacity-70")}
                    >
                        <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                        Sync
                    </Button>
                </div>
            </motion.div>

            {/* Stats Overview */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
                <motion.div variants={itemVariants} className={cn(GLASS_CARD, "p-6 rounded-2xl relative overflow-hidden group")}>
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="h-16 w-16" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Active Bids</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">{stats.total}</span>
                        <span className="text-sm text-emerald-500 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" /> +12%
                        </span>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className={cn(GLASS_CARD, "p-6 rounded-2xl relative overflow-hidden group")}>
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertCircle className="h-16 w-16 text-yellow-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending Action</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-yellow-600 dark:text-yellow-500">{stats.pending}</span>
                        <span className="text-sm text-gray-400">awaiting review</span>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className={cn(GLASS_CARD, "p-6 rounded-2xl relative overflow-hidden group")}>
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="h-16 w-16 text-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">New Demand (24h)</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                            ¥{(stats.todayValue / 1000000).toFixed(1)}M
                        </span>
                    </div>
                </motion.div>
            </motion.div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 gap-6">

                {/* Controls */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={cn(GLASS_CARD, "p-2 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between sticky top-4 z-10")}
                >
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by customer, make, model..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-transparent border-none focus-visible:ring-0"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar p-1">
                        {['all', 'PENDING', 'APPROVED', 'WON'].map((st) => (
                            <button
                                key={st}
                                onClick={() => setFilter(st)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                                    filter === st
                                        ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white"
                                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white/50"
                                )}
                            >
                                {st.charAt(0).toUpperCase() + st.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Bids List */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-4"
                >
                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                            ))
                        ) : filteredBids.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-20 text-gray-400"
                            >
                                <Filter className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No bids match your filters</p>
                            </motion.div>
                        ) : (
                            filteredBids.map((bid) => (
                                <motion.div
                                    key={bid.id}
                                    variants={itemVariants}
                                    layoutId={bid.id}
                                    onClick={() => setSelectedBid(bid)}
                                    className={cn(
                                        GLASS_CARD,
                                        "p-4 rounded-xl cursor-pointer hover:border-blue-500/30 transition-all hover:shadow-md group relative overflow-hidden"
                                    )}
                                >
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-gray-300 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="flex flex-col md:flex-row md:items-center gap-4">

                                        {/* Customer Info */}
                                        <div className="flex items-center gap-4 min-w-[200px]">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold">
                                                {bid.customer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">{bid.customer.name}</h3>
                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {bid.customer.country || 'Global'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Vehicle Request */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-lg text-gray-800 dark:text-gray-200">
                                                    {bid.requestedMake || 'Any Make'} {bid.requestedModel}
                                                </span>
                                                {bid.vehicle && (
                                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px]">
                                                        Linked: {bid.vehicle.stockNumber}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> {formatDate(bid.createdAt)}
                                                </span>
                                                {bid.notes && (
                                                    <span className="truncate max-w-[200px] italic opacity-70">
                                                        "{bid.notes}"
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Budget & Status */}
                                        <div className="flex items-center justify-between md:justify-end gap-6 min-w-[250px]">
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500 uppercase tracking-wide">Max Budget</p>
                                                <p className="text-lg font-bold font-mono text-gray-900 dark:text-white">
                                                    {formatCurrency(bid.maxBudget, bid.currency)}
                                                </p>
                                            </div>

                                            <Badge variant="outline" className={cn("px-3 py-1 text-xs font-semibold uppercase", STATUS_COLORS[bid.status])}>
                                                {bid.status}
                                            </Badge>

                                            <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                                                <ArrowRight className="h-4 w-4 text-gray-400" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Detail Dialog */}
            <Dialog open={!!selectedBid} onOpenChange={() => setSelectedBid(null)}>
                <DialogContent className={cn(GLASS_CARD, "sm:max-w-xl border-none")}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            Bid Review
                            <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                ID: {selectedBid?.id.slice(-6)}
                            </span>
                        </DialogTitle>
                        <DialogDescription>Review customer request and validate budget.</DialogDescription>
                    </DialogHeader>

                    {selectedBid && (
                        <div className="space-y-6 py-4">
                            {/* Key Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                    <p className="text-xs text-gray-500 uppercase">Customer Profile</p>
                                    <p className="font-semibold text-lg mt-1">{selectedBid.customer.name}</p>
                                    <p className="text-sm text-gray-500">{selectedBid.customer.email}</p>
                                    <p className="text-sm text-gray-500">{selectedBid.customer.country}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                    <p className="text-xs text-gray-500 uppercase">Budget Limit</p>
                                    <p className="font-bold font-mono text-2xl mt-1 text-emerald-600">
                                        {formatCurrency(selectedBid.maxBudget, selectedBid.currency)}
                                    </p>
                                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                        <AlertCircle className="h-3 w-3" /> Wallet check: Passed
                                    </p>
                                </div>
                            </div>

                            {/* Request Details */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Vehicle Request</h4>
                                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-lg">{selectedBid.requestedMake || 'Any'} {selectedBid.requestedModel}</span>
                                        <Badge variant="outline">{selectedBid.status}</Badge>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                                        "{selectedBid.notes || 'No specific notes provided.'}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-3 sm:gap-2">
                        {selectedBid?.status === 'PENDING' ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => handleAction('REJECTED')}
                                    disabled={processing}
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                    <X className="mr-2 h-4 w-4" /> REJECT
                                </Button>
                                <Button
                                    onClick={() => handleAction('APPROVED')}
                                    disabled={processing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <Check className="mr-2 h-4 w-4" /> APPROVE & SEND TO AUCTION
                                </Button>
                            </>
                        ) : selectedBid?.status === 'APPROVED' ? (
                            <Link href={`/vehicle-export/auction/new?bidId=${selectedBid.id}`} className="w-full sm:w-auto">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Launch Auction Entry
                                </Button>
                            </Link>
                        ) : (
                            <Button variant="outline" onClick={() => setSelectedBid(null)}>
                                Close Review
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
