"use client";

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn, SlideUp, StaggerContainer, StaggerItem, HoverCard as MotionCard } from '@/components/ui/motion/primitives';
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
import { Wallet, RefreshCw, CheckCircle, Clock, XCircle, Loader2, CreditCard, ArrowUpRight, ArrowDownLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface Transaction {
    id: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    reference: string | null;
    notes: string | null;
    proofUrl?: string;
    createdAt: string;
    wallet: {
        customer: { id: string; name: string; email: string };
    };
}

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    CLEARED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
};

export default function FinanceDashboardPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [processing, setProcessing] = useState(false);
    const [search, setSearch] = useState('');
    
    const fetchTransactions = useCallback(async () => {
        try {
            setRefreshing(true);
            const res = await fetch('/api/vehicle-export/wallet/transactions?status=PENDING');
            if (res.ok) {
                const data = await res.json();
                setTransactions(data.transactions || []);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const verifyTransaction = async (txId: string, newStatus: 'CLEARED' | 'REJECTED') => {
        setProcessing(true);
        try {
            const res = await fetch(`/api/vehicle-export/wallet/transactions/${txId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                toast.success(newStatus === 'CLEARED' ? 'Deposit Verified' : 'Deposit Rejected', { description: `Transaction has been marked as ${newStatus.toLowerCase()}.` });
                fetchTransactions();
                setSelectedTx(null);
            } else {
                toast.error('Error', { description: 'Failed to update transaction.' });
            }
        } catch (error) {
            toast.error('Error', { description: 'Failed to update transaction.' });
        } finally {
            setProcessing(false);
        }
    };

    const pendingAmount = transactions.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-black p-4 sm:p-8 space-y-8">
            {/* Header */}
            <FadeIn className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                            <Wallet className="h-6 w-6" />
                        </div>
                        Finance Hub
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">Manage real-time deposits and wallet settlements.</p>
                </div>
                <Button
                    variant="outline"
                    onClick={fetchTransactions}
                    disabled={refreshing}
                    className="h-10 bg-white dark:bg-gray-900"
                >
                    <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                    Refresh Data
                </Button>
            </FadeIn>

            {/* Wallet Cards */}
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StaggerItem>
                    <MotionCard className="h-48 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-xl shadow-blue-900/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-white/20 transition-all duration-700" />
                        <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <span className="text-blue-100 text-sm font-medium">Pending Approvals</span>
                            </div>
                            <div>
                                <h3 className="text-4xl font-bold mt-2">${pendingAmount.toLocaleString()}</h3>
                                <p className="text-blue-200 mt-1">{transactions.length} transactions waiting</p>
                            </div>
                        </div>
                    </MotionCard>
                </StaggerItem>

                <StaggerItem>
                    <MotionCard className="h-48 bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
                        <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                                    <ArrowUpRight className="h-6 w-6" />
                                </div>
                                <span className="text-gray-500 font-medium">Total Inflow (Today)</span>
                            </div>
                            <div>
                                <h3 className="text-4xl font-bold mt-2 text-gray-900 dark:text-white">$0.00</h3>
                                <p className="text-emerald-500 mt-1 flex items-center gap-1 text-sm font-medium">
                                    +0% <span className="text-gray-400 font-normal">vs yesterday</span>
                                </p>
                            </div>
                        </div>
                    </MotionCard>
                </StaggerItem>

                <StaggerItem>
                    <MotionCard className="h-48 bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm p-6 flex flex-col justify-center items-center text-center cursor-pointer hover:border-blue-500 transition-colors border-dashed border-2">
                        <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-500 mb-3">
                            <CreditCard className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Quick Action</h3>
                        <p className="text-sm text-gray-500 mt-1">Manually credit a wallet</p>
                    </MotionCard>
                </StaggerItem>
            </StaggerContainer>

            {/* Transactions Panel */}
            <SlideUp className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Incoming Deposits</h2>
                        <p className="text-gray-500 text-sm">Review bank transfers and slip uploads</p>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search reference..."
                            className="pl-10 bg-gray-50 dark:bg-gray-800 border-none rounded-xl"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                            <TableRow>
                                <TableHead className="w-[300px]">Customer</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><div className="h-10 w-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /></TableCell>
                                        <TableCell><div className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></TableCell>
                                        <TableCell><div className="h-6 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></TableCell>
                                        <TableCell><div className="h-6 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></TableCell>
                                        <TableCell><div className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></TableCell>
                                        <TableCell><div className="h-8 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <CheckCircle className="h-12 w-12 text-emerald-100 dark:text-emerald-900 mb-4" />
                                            <p className="font-medium text-gray-900 dark:text-white">All Caught Up</p>
                                            <p className="text-sm">No pending deposits found.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((tx) => (
                                    <TableRow key={tx.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                                    {tx.wallet?.customer?.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{tx.wallet?.customer?.name}</p>
                                                    <p className="text-xs text-gray-500">{tx.wallet?.customer?.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono font-bold text-gray-900 dark:text-white">
                                            ${Number(tx.amount).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm text-gray-500">
                                            {tx.reference || '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {new Date(tx.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn("capitalize px-3 py-1", STATUS_STYLES[tx.status])}>
                                                {tx.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="ghost" className="hover:bg-blue-50 hover:text-blue-600" onClick={() => setSelectedTx(tx)}>
                                                Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {loading ? (
                        <div className="p-8 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-gray-400" /></div>
                    ) : transactions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No transactions</div>
                    ) : (
                        transactions.map((tx) => (
                            <div key={tx.id} className="p-4 active:bg-gray-50 dark:active:bg-gray-800 transition-colors" onClick={() => setSelectedTx(tx)}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 font-bold">
                                            {tx.wallet?.customer?.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-sm font-semibold text-gray-900 dark:text-white">{tx.wallet?.customer?.name}</p>
                                            <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={cn("text-[10px] px-2", STATUS_STYLES[tx.status])}>
                                        {tx.status}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center pl-14">
                                    <div className="font-mono text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                        {tx.reference || 'No Ref'}
                                    </div>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">${Number(tx.amount).toFixed(2)}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </SlideUp>

            {/* Verification Dialog */}
            <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Verify Transaction</DialogTitle>
                        <DialogDescription>
                            Review the details of this deposit before crediting the user's wallet.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTx && (
                        <div className="space-y-6 pt-4">
                            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-500 mb-1">Deposit Amount</p>
                                <p className="text-4xl font-bold text-gray-900 dark:text-white">${Number(selectedTx.amount).toFixed(2)}</p>
                            </div>

                            {selectedTx.proofUrl && (
                                <div className="space-y-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Proof</span>
                                    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                                        {/* Using img tag for simplicity with external URLs, or Image if domain is whitelisted */}
                                        <img
                                            src={selectedTx.proofUrl}
                                            alt="Payment Proof"
                                            className="object-contain w-full h-full"
                                        />
                                        <a
                                            href={selectedTx.proofUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md hover:bg-black transition-colors"
                                        >
                                            View Full
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 text-sm">Customer</span>
                                    <span className="font-medium text-sm">{selectedTx.wallet?.customer?.name}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 text-sm">Reference ID</span>
                                    <span className="font-mono text-sm">{selectedTx.reference || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <span className="text-gray-500 text-sm">Notes</span>
                                    <span className="font-medium text-sm truncate max-w-[200px]">{selectedTx.notes || 'None'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 mt-2">
                        <Button
                            variant="outline"
                            className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                            onClick={() => selectedTx && verifyTransaction(selectedTx.id, 'REJECTED')}
                            disabled={processing}
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reject
                        </Button>
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                            onClick={() => selectedTx && verifyTransaction(selectedTx.id, 'CLEARED')}
                            disabled={processing}
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verify & Credits
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
