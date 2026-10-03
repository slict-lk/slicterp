"use client";

import { useState, useEffect } from "react";
import {
    CalendarDays,
    Plus,
    Lock,
    Unlock,
    Search,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Calendar,
    MoreHorizontal,
    RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function getEndOfMonth(year: number, month: number) {
    return new Date(year, month, 0);
}

export default function AccountingPeriodsPage() {
    const [periods, setPeriods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [filterYear, setFilterYear] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
    const [periodToClose, setPeriodToClose] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [closing, setClosing] = useState(false);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [createForm, setCreateForm] = useState({
        year: currentYear,
        month: currentMonth,
    });

    const fetchPeriods = async () => {
        setLoading(true);
        try {
            let url = "/api/accounting/periods";
            const params: string[] = [];
            if (filterYear !== "all") params.push(`year=${filterYear}`);
            if (filterStatus !== "all") params.push(`status=${filterStatus}`);
            if (params.length > 0) url += `?${params.join("&")}`;

            const res = await fetch(url);
            if (res.ok) {
                setPeriods(await res.json());
                setError(null);
            } else {
                setError("Failed to fetch periods");
            }
        } catch (err) {
            console.error("Error fetching periods:", err);
            setError("Failed to fetch periods");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPeriods();
    }, [filterYear, filterStatus]);

    const handleCreatePeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const year = createForm.year;
        const month = createForm.month;
        const startDate = new Date(year, month - 1, 1);
        const endDate = getEndOfMonth(year, month);
        const name = `${MONTH_NAMES[month - 1]} ${year}`;

        try {
            const res = await fetch("/api/accounting/periods", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    year,
                    month,
                    name,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                }),
            });

            if (res.ok) {
                setIsCreateOpen(false);
                setCreateForm({ year: currentYear, month: currentMonth });
                fetchPeriods();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to create period");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to create period");
        } finally {
            setSubmitting(false);
        }
    };

    const handleClosePeriod = async () => {
        if (!periodToClose) return;
        setClosing(true);

        try {
            const res = await fetch(`/api/accounting/periods/${periodToClose.id}/close`, {
                method: "PATCH",
            });

            if (res.ok) {
                setIsCloseDialogOpen(false);
                setPeriodToClose(null);
                fetchPeriods();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to close period");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to close period");
        } finally {
            setClosing(false);
        }
    };


    const getStatusBadge = (status: string) => {
        switch (status) {
            case "OPEN":
                return (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 gap-1">
                        <Unlock className="h-3 w-3" />
                        Open
                    </Badge>
                );
            case "CLOSED":
                return (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-0 gap-1">
                        <Lock className="h-3 w-3" />
                        Closed
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {status}
                    </Badge>
                );
        }
    };

    // Derive stats
    const openCount = periods.filter((p) => p.status === "OPEN").length;
    const closedCount = periods.filter((p) => p.status === "CLOSED").length;
    const totalCount = periods.length;
    const years = [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a);

    // Filter by search
    const filteredPeriods = periods.filter((p) => {
        if (!search) return true;
        return p.name?.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                        <span className="p-2 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/20 text-white">
                            <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" />
                        </span>
                        Accounting Periods
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Manage fiscal periods for transaction posting. Close periods to lock financial data.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={fetchPeriods}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto">
                                <Plus className="w-4 h-4 mr-2" />
                                New Period
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[450px]">
                            <form onSubmit={handleCreatePeriod}>
                                <DialogHeader>
                                    <DialogTitle>Create Accounting Period</DialogTitle>
                                    <DialogDescription>
                                        Open a new fiscal period for transaction posting.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="year">Year</Label>
                                            <Select
                                                value={String(createForm.year)}
                                                onValueChange={(val) =>
                                                    setCreateForm({ ...createForm, year: Number(val) })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                                                        <SelectItem key={y} value={String(y)}>
                                                            {y}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="month">Month</Label>
                                            <Select
                                                value={String(createForm.month)}
                                                onValueChange={(val) =>
                                                    setCreateForm({ ...createForm, month: Number(val) })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {MONTH_NAMES.map((name, idx) => (
                                                        <SelectItem key={idx} value={String(idx + 1)}>
                                                            {name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg space-y-1">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Period Name
                                        </p>
                                        <p className="text-base font-semibold">
                                            {MONTH_NAMES[createForm.month - 1]} {createForm.year}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {format(new Date(createForm.year, createForm.month - 1, 1), "MMM dd, yyyy")}
                                            {" — "}
                                            {format(getEndOfMonth(createForm.year, createForm.month), "MMM dd, yyyy")}
                                        </p>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreateOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? "Creating..." : "Create Period"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalCount}</p>
                            <p className="text-xs text-gray-500">Total Periods</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{openCount}</p>
                            <p className="text-xs text-gray-500">Open Periods</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            <Lock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{closedCount}</p>
                            <p className="text-xs text-gray-500">Closed Periods</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle>Fiscal Periods</CardTitle>
                            <CardDescription>
                                Manage your accounting periods. Open periods accept transactions; closed periods are locked.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <div className="relative w-full sm:w-[200px]">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Select value={filterYear} onValueChange={setFilterYear}>
                                <SelectTrigger className="w-full sm:w-[130px]">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {years.map((y) => (
                                        <SelectItem key={y} value={String(y)}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-full sm:w-[130px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="OPEN">Open</SelectItem>
                                    <SelectItem value="CLOSED">Closed</SelectItem>
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
                                    <TableHead className="w-[220px]">Period</TableHead>
                                    <TableHead>Year</TableHead>
                                    <TableHead>Month</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="hidden md:table-cell">Closed At</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                                            Loading periods...
                                        </TableCell>
                                    </TableRow>
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-red-500">
                                            {error}
                                        </TableCell>
                                    </TableRow>
                                ) : filteredPeriods.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                                            <CalendarDays className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                            <p className="text-sm font-medium">No periods found</p>
                                            <p className="text-xs mt-1">
                                                Create your first accounting period to start posting transactions.
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPeriods.map((period) => (
                                        <TableRow
                                            key={period.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${period.status === 'OPEN' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {period.name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{period.year}</TableCell>
                                            <TableCell className="text-sm">
                                                {typeof period.month === 'number' && period.month >= 1 && period.month <= 12
                                                    ? MONTH_NAMES[period.month - 1]
                                                    : 'Unknown'}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                                {(() => { const d = new Date(period.startDate); return isNaN(d.getTime()) ? 'Invalid date' : format(d, "MMM dd, yyyy"); })()}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                                {(() => { const d = new Date(period.endDate); return isNaN(d.getTime()) ? 'Invalid date' : format(d, "MMM dd, yyyy"); })()}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(period.status)}</TableCell>
                                            <TableCell className="hidden md:table-cell text-sm text-gray-500">
                                                {period.closedAt
                                                    ? format(new Date(period.closedAt), "MMM dd, yyyy HH:mm")
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            aria-label="Period actions"
                                                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {period.status === "OPEN" ? (
                                                            <DropdownMenuItem
                                                                className="text-red-600"
                                                                onClick={() => {
                                                                    setPeriodToClose(period);
                                                                    setIsCloseDialogOpen(true);
                                                                }}
                                                            >
                                                                <Lock className="h-4 w-4 mr-2" />
                                                                Close Period
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem className="text-gray-400" disabled>
                                                                <Lock className="h-4 w-4 mr-2" />
                                                                Already Closed
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Close Period Confirmation Dialog */}
            <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Close Accounting Period
                        </DialogTitle>
                        <DialogDescription>
                            This action will lock all transactions in this period. No new journal entries,
                            invoices, or payments can be posted to a closed period.
                        </DialogDescription>
                    </DialogHeader>

                    {periodToClose && (
                        <div className="py-4">
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-2">
                                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                                    You are about to close:
                                </p>
                                <p className="text-lg font-bold text-red-900 dark:text-red-200">
                                    {periodToClose.name}
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-400">
                                    {(() => { const d = new Date(periodToClose.startDate); return isNaN(d.getTime()) ? 'Invalid date' : format(d, "MMM dd, yyyy"); })()} —{" "}
                                    {(() => { const d = new Date(periodToClose.endDate); return isNaN(d.getTime()) ? 'Invalid date' : format(d, "MMM dd, yyyy"); })()}
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsCloseDialogOpen(false);
                                setPeriodToClose(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={closing}
                            onClick={handleClosePeriod}
                        >
                            {closing ? "Closing..." : "Close Period"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
