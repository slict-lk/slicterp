"use client";

import { useState, useEffect } from "react";
import {
    BookOpen,
    Search,
    Plus,
    Filter,
    Trash2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { format } from "date-fns";
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

export default function JournalEntriesPage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState('ALL');

    const filteredEntries = entries.filter((e: any) => {
        const matchesSearch = e.reference?.toLowerCase().includes(search.toLowerCase()) ||
            e.description?.toLowerCase().includes(search.toLowerCase());
        const matchesModule = moduleFilter === 'ALL' || e.sourceModule === moduleFilter;
        return matchesSearch && matchesModule;
    });

    // Modal Data
    const [periods, setPeriods] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        entryDate: new Date().toISOString().split('T')[0],
        reference: '',
        description: '',
        periodId: ''
    });

    const [lines, setLines] = useState([
        { accountId: '', debit: 0, credit: 0, description: '' },
        { accountId: '', debit: 0, credit: 0, description: '' }
    ]);

    const fetchEntries = async () => {
        try {
            const res = await fetch('/api/accounting/journal-entries');
            if (res.ok) setEntries(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();

        async function fetchLookups() {
            try {
                const [pRes, aRes] = await Promise.all([
                    fetch('/api/accounting/periods'),
                    fetch('/api/accounting/accounts')
                ]);
                if (pRes.ok) {
                    const pData = await pRes.json();
                    setPeriods(Array.isArray(pData) ? pData.filter((p: any) => p.status === 'OPEN') : []);
                }
                if (aRes.ok) {
                    const aData = await aRes.json();
                    setAccounts(Array.isArray(aData) ? aData : []);
                }
            } catch (e) {
                console.error(e);
            }
        }
        fetchLookups();
    }, []);

    const totalDebits = lines.reduce((acc, line) => acc + (Number(line.debit) || 0), 0);
    const totalCredits = lines.reduce((acc, line) => acc + (Number(line.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) return alert("Journal entry is not balanced.");
        if (!formData.periodId) return alert("Please select an open period.");
        if (lines.some(l => !l.accountId)) return alert("Please select an account for all lines.");

        setSubmitting(true);
        try {
            const res = await fetch('/api/accounting/journal-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    entryDate: new Date(formData.entryDate).toISOString(),
                    lines: lines.map(l => ({
                        ...l,
                        debit: Number(l.debit) || 0,
                        credit: Number(l.credit) || 0
                    }))
                })
            });

            if (res.ok) {
                setIsOpen(false);
                setFormData({
                    entryDate: new Date().toISOString().split('T')[0],
                    reference: '',
                    description: '',
                    periodId: ''
                });
                setLines([
                    { accountId: '', debit: 0, credit: 0, description: '' },
                    { accountId: '', debit: 0, credit: 0, description: '' }
                ]);
                fetchEntries();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to post entry");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        (newLines[index] as any)[field] = value;
        // Prevent both debit and credit having value
        if (field === 'debit' && Number(value) > 0) newLines[index].credit = 0;
        if (field === 'credit' && Number(value) > 0) newLines[index].debit = 0;
        setLines(newLines);
    };

    const addLine = () => {
        setLines([...lines, { accountId: '', debit: 0, credit: 0, description: '' }]);
    };

    const removeLine = (index: number) => {
        if (lines.length <= 2) return;
        setLines(lines.filter((_, i) => i !== index));
    };

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                        <span className="p-2 rounded-xl bg-purple-600 shadow-lg shadow-purple-600/20 text-white">
                            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                        </span>
                        Journal Entries
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        View and manage double-entry general ledger transactions.
                    </p>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" />
                            Manual Entry
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle>Create Journal Entry</DialogTitle>
                                <DialogDescription>
                                    Post a manual double-entry transaction to the ledger.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="entryDate">Date</Label>
                                        <Input
                                            id="entryDate"
                                            type="date"
                                            required
                                            value={formData.entryDate}
                                            onChange={e => setFormData({ ...formData, entryDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="periodId">Accounting Period</Label>
                                        <Select
                                            value={formData.periodId}
                                            onValueChange={val => setFormData({ ...formData, periodId: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select period" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {periods.length === 0 && <SelectItem value="none" disabled>No open periods</SelectItem>}
                                                {periods.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="reference">Reference</Label>
                                        <Input
                                            id="reference"
                                            placeholder="e.g. ADJ-001"
                                            required
                                            value={formData.reference}
                                            onChange={e => setFormData({ ...formData, reference: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Memo / Description</Label>
                                        <Input
                                            id="description"
                                            placeholder="Entry description"
                                            required
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Lines */}
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Journal Lines</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={addLine}>
                                            <Plus className="w-3 h-3 mr-1" /> Add Line
                                        </Button>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-md border p-1 border-slate-200 dark:border-slate-800">
                                        <div className="grid grid-cols-12 gap-2 p-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            <div className="col-span-4">Account</div>
                                            <div className="col-span-3">Description</div>
                                            <div className="col-span-2 text-right">Debit</div>
                                            <div className="col-span-2 text-right">Credit</div>
                                            <div className="col-span-1"></div>
                                        </div>

                                        {lines.map((line, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 p-2 pt-0 items-center">
                                                <div className="col-span-4">
                                                    <Select
                                                        value={line.accountId}
                                                        onValueChange={val => updateLine(idx, 'accountId', val)}
                                                    >
                                                        <SelectTrigger className="h-8 text-sm">
                                                            <SelectValue placeholder="Select account" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {accounts.map(a => (
                                                                <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="col-span-3">
                                                    <Input
                                                        className="h-8 text-sm"
                                                        placeholder="Line memo"
                                                        value={line.description}
                                                        onChange={e => updateLine(idx, 'description', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-sm text-right"
                                                        step="0.01"
                                                        min="0"
                                                        value={line.debit || ''}
                                                        onChange={e => updateLine(idx, 'debit', e.target.value)}
                                                        disabled={Number(line.credit) > 0}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-sm text-right"
                                                        step="0.01"
                                                        min="0"
                                                        value={line.credit || ''}
                                                        onChange={e => updateLine(idx, 'credit', e.target.value)}
                                                        disabled={Number(line.debit) > 0}
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-600"
                                                        onClick={() => removeLine(idx)}
                                                        disabled={lines.length <= 2}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}

                                        <div className="grid grid-cols-12 gap-2 p-3 mt-1 bg-white dark:bg-slate-950 border-t rounded-b-sm">
                                            <div className="col-span-7 flex justify-end items-center pr-2 font-semibold">
                                                Total:
                                            </div>
                                            <div className={`col-span-2 text-right font-medium ${isBalanced ? 'text-green-600' : 'text-red-500'}`}>
                                                {formatCurrency(totalDebits, 'LKR')}
                                            </div>
                                            <div className={`col-span-2 text-right font-medium ${isBalanced ? 'text-green-600' : 'text-red-500'}`}>
                                                {formatCurrency(totalCredits, 'LKR')}
                                            </div>
                                            <div className="col-span-1"></div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={submitting || !isBalanced || !formData.periodId}>
                                    {submitting ? 'Posting...' : 'Post Entry'}
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
                            <CardTitle>Ledger Transactions</CardTitle>
                            <CardDescription>{entries.length} entries</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-[280px]">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Search by reference..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={moduleFilter} onValueChange={setModuleFilter}>
                                <SelectTrigger className="w-[160px]">
                                    <Filter className="w-4 h-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="All Modules" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Modules</SelectItem>
                                    <SelectItem value="vehicle-export">Vehicle Export</SelectItem>
                                    <SelectItem value="spareparts">Spareparts</SelectItem>
                                    <SelectItem value="hotel">Hotel</SelectItem>
                                    <SelectItem value="pos">POS</SelectItem>
                                    <SelectItem value="restaurant">Restaurant</SelectItem>
                                    <SelectItem value="sales">Sales</SelectItem>
                                    <SelectItem value="hr">HR</SelectItem>
                                    <SelectItem value="properties">Properties</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-32">Date</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead className="hidden md:table-cell">Description</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Debits</TableHead>
                                    <TableHead className="text-right hidden sm:table-cell">Credits</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">Loading entries...</TableCell>
                                    </TableRow>
                                ) : filteredEntries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            {search ? 'No journal entries match your search.' : 'No journal entries found.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEntries.map((entry: any) => {
                                        const entryDebits = entry.lines?.reduce((acc: number, line: any) => acc + (line.debit > 0 ? (line.baseCurrency || line.debit) : 0), 0) || 0;
                                        const entryCredits = entry.lines?.reduce((acc: number, line: any) => acc + (line.credit > 0 ? (line.baseCurrency || line.credit) : 0), 0) || 0;

                                        return (
                                            <TableRow key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                                                <TableCell className="text-sm whitespace-nowrap">{format(new Date(entry.entryDate), 'MMM dd, yyyy')}</TableCell>
                                                <TableCell className="font-mono text-sm text-purple-600 dark:text-purple-400">{entry.reference}</TableCell>
                                                <TableCell className="text-sm border-r border-slate-100 dark:border-slate-800">
                                                    {entry.sourceModule ? (
                                                        <Badge variant="outline" className="capitalize text-slate-600 bg-slate-50 border-slate-200">
                                                            {entry.sourceModule.replace('-', ' ')}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Manual</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-sm text-gray-500 max-w-[300px] truncate">{entry.description}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={entry.status === 'POSTED'
                                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                    }>
                                                        {entry.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-sm">{formatCurrency(entryDebits, 'LKR')}</TableCell>
                                                <TableCell className="text-right font-medium text-sm hidden sm:table-cell">{formatCurrency(entryCredits, 'LKR')}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
