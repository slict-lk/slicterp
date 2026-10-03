"use client";

import { useState, useEffect } from "react";
import {
    Landmark,
    Search,
    Plus,
    TrendingDown,
    TrendingUp,
    Building2,
    Wallet,
    Receipt
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ChartOfAccountsPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal state
    const [isOpen, setIsOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'ASSET',
        normalBalance: 'DEBIT',
        currency: 'LKR',
        description: ''
    });

    const fetchAccounts = async () => {
        try {
            setError(null);
            const res = await fetch('/api/accounting/accounts');
            if (res.ok) {
                setAccounts(await res.json());
            } else {
                setError('Failed to load accounts. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred while loading accounts.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/accounting/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsOpen(false);
                setFormData({
                    code: '', name: '', type: 'ASSET', normalBalance: 'DEBIT',
                    currency: 'LKR', description: ''
                });
                fetchAccounts();
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.error || 'Failed to create account');
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'An unexpected error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const getAccountIcon = (type: string) => {
        switch (type) {
            case 'ASSET': return <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
            case 'LIABILITY': return <Building2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
            case 'EQUITY': return <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
            case 'REVENUE': return <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
            case 'EXPENSE': return <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
            default: return <Wallet className="w-4 h-4 text-gray-400" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'ASSET': return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
            case 'LIABILITY': return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
            case 'EQUITY': return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
            case 'REVENUE': return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
            case 'EXPENSE': return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    const filteredAccounts = accounts.filter(a =>
        !search || (a.code ?? '').toLowerCase().includes(search.toLowerCase()) || (a.name ?? '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                        <span className="p-2 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/20 text-white">
                            <Landmark className="h-5 w-5 sm:h-6 sm:w-6" />
                        </span>
                        Chart of Accounts
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Manage your general ledger structure and account classifications.
                    </p>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle>Add New Account</DialogTitle>
                                <DialogDescription>
                                    Create a new ledger account for your chart of accounts.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="code">Account Code</Label>
                                    <Input
                                        id="code"
                                        placeholder="e.g. 1000"
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Account Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Cash equivalents"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="type">Type</Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={val => setFormData({ ...formData, type: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ASSET">Asset</SelectItem>
                                                <SelectItem value="LIABILITY">Liability</SelectItem>
                                                <SelectItem value="EQUITY">Equity</SelectItem>
                                                <SelectItem value="REVENUE">Revenue</SelectItem>
                                                <SelectItem value="EXPENSE">Expense</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="balance">Normal Balance</Label>
                                        <Select
                                            value={formData.normalBalance}
                                            onValueChange={val => setFormData({ ...formData, normalBalance: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select balance" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DEBIT">Debit</SelectItem>
                                                <SelectItem value="CREDIT">Credit</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="currency">Currency</Label>
                                    <Input
                                        id="currency"
                                        placeholder="LKR"
                                        value={formData.currency}
                                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        placeholder="Optional description"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Saving...' : 'Save Account'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle>All Accounts</CardTitle>
                            <CardDescription>{accounts.length} total accounts</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-[280px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search by code or name..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-24">Code</TableHead>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead className="hidden md:table-cell">Type</TableHead>
                                    <TableHead className="hidden lg:table-cell">Normal Balance</TableHead>
                                    <TableHead className="hidden lg:table-cell">Currency</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">Loading accounts...</TableCell>
                                    </TableRow>
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-red-500">{error}</TableCell>
                                    </TableRow>
                                ) : filteredAccounts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            {search ? 'No accounts match your search.' : 'No accounts found. Seed your chart of accounts.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAccounts.map((acct) => (
                                        <TableRow key={acct.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <TableCell className="font-mono text-sm text-blue-600 dark:text-blue-400">{acct.code}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getAccountIcon(acct.type)}
                                                    <span className="font-medium text-gray-900 dark:text-white">{acct.name}</span>
                                                    {acct.isSystemAccount && (
                                                        <Badge variant="secondary" className="text-[9px]">SYSTEM</Badge>
                                                    )}
                                                </div>
                                                {/* Show type on mobile since column is hidden */}
                                                <span className="md:hidden text-xs text-gray-500 ml-6">{acct.type}</span>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <Badge variant="outline" className={`${getTypeColor(acct.type)} text-[10px] uppercase`}>
                                                    {acct.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-sm text-gray-500">{acct.normalBalance || 'DEBIT'}</TableCell>
                                            <TableCell className="hidden lg:table-cell text-sm text-gray-500">{acct.currency}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
