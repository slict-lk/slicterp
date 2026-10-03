"use client";

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FadeIn, SlideUp, StaggerContainer, StaggerItem } from '@/components/ui/motion/primitives';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Gavel, RefreshCw, Trophy, XCircle, Loader2, PlayCircle, TrendingUp, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// --- Types ---
interface Bid {
    id: string;
    maxBudget: number | null;
    notes: string | null;
    proxyBidStatus: string;
    status: string;
    createdAt: string;
    customer: { id: string; name: string; country: string | null };
    vehicle: { id: string; stockNumber: string; make: string; model: string; year: number } | null;
}

// --- Terminal Styles ---
const TERMINAL_GREEN = "text-[#00ff41]";
const TERMINAL_AMBER = "text-[#ffb000]";
const TERMINAL_RED = "text-[#ff0000]";
const TERMINAL_BG = "bg-black";
const TERMINAL_PANEL = "bg-[#0a0a0a] border border-[#333]";

const PROXY_STATUS_COLORS: Record<string, string> = {
    PENDING: 'text-gray-400 border-gray-600',
    ACTIVE: 'text-[#00ff41] border-[#00ff41] bg-[#00ff41]/10',
    WON: 'text-[#00ff41] border-[#00ff41] bg-[#00ff41]/20',
    LOST: 'text-[#ff0000] border-[#ff0000] bg-[#ff0000]/10',
    OUTBID: 'text-[#ffb000] border-[#ffb000] bg-[#ffb000]/10',
};

// --- Helper Components ---
function DigitalClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);
    return (
        <div className="font-mono text-xl tracking-widest text-[#00ff41]">
            {time.toLocaleTimeString('en-US', { hour12: false })}
        </div>
    );
}

function TickerItem({ label, value, trend }: any) {
    return (
        <div className="flex flex-col border-r border-[#333] px-6">
            <span className="text-xs uppercase text-gray-500 tracking-wider mb-1">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-white">{value}</span>
                {trend === 'up' && <TrendingUp className="h-4 w-4 text-[#00ff41]" />}
            </div>
        </div>
    );
}

// --- Main Page ---

export default function AuctioneerDashboardPage() {
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
    const [resultStatus, setResultStatus] = useState<string>('WON');
    const [winningPrice, setWinningPrice] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    
    const fetchBids = useCallback(async () => {
        try {
            setRefreshing(true);
            const res = await fetch('/api/vehicle-export/bids?proxyBidStatus=ACTIVE');
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
    }, []);

    useEffect(() => {
        fetchBids();
    }, [fetchBids]);

    const recordResult = async () => {
        if (!selectedBid) return;
        setProcessing(true);
        try {
            const res = await fetch(`/api/vehicle-export/bids/${selectedBid.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proxyBidStatus: resultStatus,
                    winningPrice: resultStatus === 'WON' ? parseFloat(winningPrice) : undefined,
                }),
            });
            if (res.ok) {
                toast.success("System Update", { description: `Transaction Recorded: ${resultStatus}` });
                fetchBids();
                setSelectedBid(null);
                setWinningPrice('');
            } else {
                toast.error('Error', { description: 'Transaction Failed' });
            }
        } catch (error) {
            toast.error('System Error', { description: 'Network Failure' });
        } finally {
            setProcessing(false);
        }
    };

    const activeCount = bids.length;
    const potentialVolume = bids.reduce((acc, bid) => acc + (bid.maxBudget || 0), 0);

    return (
        <div className="min-h-screen bg-black text-gray-300 font-mono p-4 sm:p-6 overflow-hidden">
            {/* Top Bar (Ticker) */}
            <FadeIn>
                <div className="flex items-center justify-between border-b border-[#333] pb-6 mb-8">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-[#00ff41] animate-pulse" />
                            <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
                                Auction<span className="text-[#00ff41]">/</span>Terminal
                            </h1>
                        </div>
                        <div className="h-8 w-[1px] bg-[#333]" />
                        <DigitalClock />
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={fetchBids}
                            disabled={refreshing}
                            className="bg-black border-[#333] hover:bg-[#111] hover:text-[#00ff41] hover:border-[#00ff41] transition-all"
                        >
                            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                            SYNC
                        </Button>
                    </div>
                </div>
            </FadeIn>

            {/* Dashboard Grid */}
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)]">

                {/* Left Panel: Market Stats */}
                <StaggerItem className="lg:col-span-1 space-y-6">
                    <div className={cn(TERMINAL_PANEL, "p-6 rounded-none")}>
                        <h3 className="text-xs uppercase text-gray-500 mb-6 flex items-center gap-2">
                            <AlertCircle className="h-3 w-3" /> Market Depth
                        </h3>
                        {/* Stats content remains same */}
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                                <div>
                                    <div className="text-4xl font-bold text-white mb-1">{activeCount}</div>
                                    <div className="text-xs text-[#00ff41] uppercase">Active Orders</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white mb-1">
                                        ¥{(potentialVolume / 1000000).toFixed(1)}M
                                    </div>
                                    <div className="text-xs text-gray-500 uppercase">Est. Volume</div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-[#333]">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs">Uptime</span>
                                    <span className="text-xs text-[#00ff41]">99.9%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs">Latency</span>
                                    <span className="text-xs text-[#00ff41]">12ms</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={cn(TERMINAL_PANEL, "p-4 hidden lg:flex flex-1")}>
                        <div className="h-40 w-full flex items-center justify-center border border-dashed border-[#333] text-xs text-gray-600">
                            [LIVE MARKET FEED]
                        </div>
                    </div>
                </StaggerItem>

                {/* Center Panel: Order Book */}
                <StaggerItem className="lg:col-span-3">
                    <div className={cn(TERMINAL_PANEL, "h-full flex flex-col min-h-[500px]")}>
                        <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#111]">
                            <h2 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                                <Clock className="h-4 w-4 text-[#00ff41]" />
                                Live Order Book
                            </h2>
                            <div className="flex gap-2 text-xs">
                                <span className="text-gray-500">Filter:</span>
                                <span className="text-[#00ff41]">ALL</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-0">
                            {loading ? (
                                <div className="flex items-center justify-center h-full text-[#00ff41] py-20">
                                    <span className="animate-pulse">INITIALIZING STREAM...</span>
                                </div>
                            ) : bids.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-600 py-20">
                                    <XCircle className="h-12 w-12 mb-4 opacity-20" />
                                    <p>NO ACTIVE ORDERS</p>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden md:block">
                                        <Table>
                                            <TableHeader className="bg-[#050505] sticky top-0 z-10">
                                                <TableRow className="border-b border-[#333] hover:bg-transparent">
                                                    <TableHead className="text-gray-500 uppercase text-xs h-10 w-[100px]">Stock #</TableHead>
                                                    <TableHead className="text-gray-500 uppercase text-xs h-10">Vehicle / Customer</TableHead>
                                                    <TableHead className="text-right text-gray-500 uppercase text-xs h-10">Limit</TableHead>
                                                    <TableHead className="text-center text-gray-500 uppercase text-xs h-10">Status</TableHead>
                                                    <TableHead className="text-right text-gray-500 uppercase text-xs h-10">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {bids.map((bid) => (
                                                    <TableRow
                                                        key={bid.id}
                                                        className="border-b border-[#222] hover:bg-[#111] transition-colors group cursor-pointer"
                                                        onClick={() => setSelectedBid(bid)}
                                                    >
                                                        <TableCell className="font-mono text-[#00ff41]">
                                                            {bid.vehicle?.stockNumber}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-bold text-sm">
                                                                    {bid.vehicle?.make} {bid.vehicle?.model}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {bid.customer.name} ({bid.customer.country || 'N/A'})
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-white">
                                                            {bid.maxBudget ? `¥${bid.maxBudget.toLocaleString()}` : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline" className={cn("rounded-sm px-2 text-[10px]", PROXY_STATUS_COLORS[bid.proxyBidStatus])}>
                                                                {bid.proxyBidStatus}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                size="sm"
                                                                className="h-7 text-xs bg-[#222] hover:bg-[#00ff41] hover:text-black border border-[#444] rounded-none transition-colors"
                                                            >
                                                                EXECUTE
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Mobile List */}
                                    <div className="md:hidden">
                                        {bids.map((bid) => (
                                            <div
                                                key={bid.id}
                                                className="p-4 border-b border-[#222] active:bg-[#111]"
                                                onClick={() => setSelectedBid(bid)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className="text-[#00ff41] font-mono text-xs block mb-1">{bid.vehicle?.stockNumber}</span>
                                                        <span className="text-white font-bold text-sm"> {bid.vehicle?.make} {bid.vehicle?.model}</span>
                                                    </div>
                                                    <Badge variant="outline" className={cn("rounded-sm px-2 text-[10px]", PROXY_STATUS_COLORS[bid.proxyBidStatus])}>
                                                        {bid.proxyBidStatus}
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between items-end mt-3">
                                                    <div className="text-xs text-gray-500">
                                                        {bid.customer.name}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-gray-500 uppercase">Limit</div>
                                                        <div className="text-white font-mono font-bold">
                                                            {bid.maxBudget ? `¥${bid.maxBudget.toLocaleString()}` : '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </StaggerItem>
            </StaggerContainer>

            {/* Execution Modal */}
            <Dialog open={!!selectedBid} onOpenChange={() => setSelectedBid(null)}>
                <DialogContent className="bg-[#0a0a0a] border border-[#333] text-gray-300 font-mono sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white uppercase flex items-center gap-2">
                            <PlayCircle className="h-5 w-5 text-[#00ff41]" />
                            Order Execution
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 text-xs uppercase">
                            Manual Settlement Input
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBid && (
                        <div className="space-y-6 pt-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 border border-[#333] bg-[#050505]">
                                    <div className="text-xs text-gray-500 mb-1">Target</div>
                                    <div className="text-[#00ff41]">{selectedBid.vehicle?.year} {selectedBid.vehicle?.make} {selectedBid.vehicle?.model}</div>
                                    <div className="text-xs text-gray-500 mt-1">{selectedBid.vehicle?.stockNumber}</div>
                                </div>
                                <div className="p-3 border border-[#333] bg-[#050505]">
                                    <div className="text-xs text-gray-500 mb-1">Limit Price</div>
                                    <div className="text-white font-bold">¥{selectedBid.maxBudget?.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500 mt-1">FOB</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs uppercase text-gray-500">Outcome</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['WON', 'LOST', 'OUTBID'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setResultStatus(status)}
                                            className={cn(
                                                "py-2 border text-xs font-bold transition-all uppercase",
                                                resultStatus === status
                                                    ? status === 'WON'
                                                        ? "bg-[#00ff41] text-black border-[#00ff41]"
                                                        : status === 'LOST'
                                                            ? "bg-[#ff0000] text-black border-[#ff0000]"
                                                            : "bg-[#ffb000] text-black border-[#ffb000]"
                                                    : "bg-transparent border-[#333] text-gray-500 hover:border-gray-500"
                                            )}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <AnimatePresence>
                                {resultStatus === 'WON' && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="space-y-2 overflow-hidden"
                                    >
                                        <label className="text-xs uppercase text-gray-500">Winning Price (JPY)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500">¥</span>
                                            <Input
                                                type="number"
                                                value={winningPrice}
                                                onChange={(e) => setWinningPrice(e.target.value)}
                                                className="bg-[#050505] border-[#333] pl-8 text-white focus:border-[#00ff41] focus:ring-0 font-mono"
                                                placeholder="0.00"
                                                autoFocus
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <DialogFooter className="mt-4">
                        <Button
                            onClick={recordResult}
                            className={cn(
                                "w-full rounded-none font-bold uppercase tracking-wider",
                                resultStatus === 'WON'
                                    ? "bg-[#00ff41] text-black hover:bg-[#00cc33]"
                                    : "bg-[#222] text-white hover:bg-[#333]"
                            )}
                            disabled={processing || (resultStatus === 'WON' && !winningPrice)}
                        >
                            {processing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                "Confirm Execution"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
