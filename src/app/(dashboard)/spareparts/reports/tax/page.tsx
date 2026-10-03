"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface TaxSummaryItem {
    rate: number;
    taxableAmount: number;
    taxAmount: number;
}

interface TaxReportData {
    period: { start: string; end: string };
    summary: TaxSummaryItem[];
    totalTax: number;
    totalSales: number;
}

export default function TaxReportPage() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [report, setReport] = useState<TaxReportData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        if (!date?.from) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('startDate', date.from.toISOString());
            if (date.to) params.set('endDate', date.to.toISOString());

            const res = await fetch(`/api/spareparts/reports/tax?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setReport(data);
            }
        } catch (error) {
            console.error('Failed to fetch report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [date]); // Auto-fetch on date change

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2
        }).format(val);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Tax Report</h1>

                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[280px] justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            {format(date.from, "LLL dd, y")} -{" "}
                                            {format(date.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(date.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>

                    <Button variant="outline" onClick={fetchReport} disabled={loading}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tax Collected</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {report ? formatCurrency(report.totalTax) : '...'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            For selected period
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taxable Sales</CardTitle>
                        <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {report ? formatCurrency(report.totalSales) : '...'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Base amount before tax
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {/* Note: API doesn't return count yet, maybe add later */}
                            -
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Number of invoices
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Breakdown Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Tax Breakdown by Rate</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tax Rate</TableHead>
                                <TableHead className="text-right">Taxable Amount</TableHead>
                                <TableHead className="text-right">Tax Collected</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report?.summary.map((item) => (
                                <TableRow key={item.rate}>
                                    <TableCell className="font-medium">
                                        {item.rate === 0 ? 'Exempt (0%)' : `${item.rate}% VAT`}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {formatCurrency(item.taxableAmount)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        {formatCurrency(item.taxAmount)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!report?.summary.length && !loading && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                        No data found for this period.
                                    </TableCell>
                                </TableRow>
                            )}
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function DollarSignIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    )
}
