"use client";

import { useState, useEffect, useRef } from "react";
import {
    ArrowRightLeft,
    Search,
    CheckCircle2,
    RefreshCw,
    UploadCloud,
    Building2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function BankReconciliationPage() {
    const [loading, setLoading] = useState(true);

    const [isUploading, setIsUploading] = useState(false);
    const mockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (mockTimeoutRef.current) {
                clearTimeout(mockTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timeoutId);
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const toastId = toast.loading('Uploading bank statement...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'accounting/bank-statements');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Upload failed');
            }

            const data = await res.json();
            // In a real app, you would pass data.url to an OCR/parser backend
            toast.success('Statement uploaded successfully', { id: toastId });

            // Mocking a successful upload parsing
            mockTimeoutRef.current = setTimeout(() => {
                toast.success('Parsed 12 transactions from statement');
                mockTimeoutRef.current = null;
            }, 1500);

        } catch (error: any) {
            console.error('Upload Error:', error);
            toast.error(error.message || 'Upload failed', { id: toastId });
        } finally {
            setIsUploading(false);
            // reset file input
            e.target.value = '';
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                        <span className="p-2 rounded-xl bg-teal-600 shadow-lg shadow-teal-600/20 text-white">
                            <ArrowRightLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                        </span>
                        Bank Reconciliation
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Match bank statement lines with ledger transactions.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Auto-Match
                    </Button>
                    <div className="relative w-full sm:w-auto">
                        <input
                            type="file"
                            id="statement-upload"
                            className="hidden"
                            accept=".csv,.pdf,.xls,.xlsx,image/*"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                        <label
                            htmlFor="statement-upload"
                            className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full sm:w-auto cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                            aria-disabled={isUploading}
                        >
                            <UploadCloud className="w-4 h-4 mr-2" />
                            {isUploading ? 'Uploading...' : 'Upload Statement'}
                        </label>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">

                {/* Left Side: Bank Statement Lines */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                    Bank Statement
                                </CardTitle>
                                <CardDescription>Unreconciled statement lines</CardDescription>
                            </div>
                            <Badge variant="secondary">0 Unmatched</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                        <div className="p-3 border-b">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input placeholder="Search descriptions..." className="pl-9" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Deposits</TableHead>
                                        <TableHead className="text-right">Withdrawals</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-gray-500">
                                            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500 opacity-30" />
                                            <p className="font-medium">All caught up!</p>
                                            <p className="text-sm mt-1">Upload a new statement to begin reconciling.</p>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Side: Ledger Transactions */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-3">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ArrowRightLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                Ledger Transactions
                            </CardTitle>
                            <CardDescription>Available payments to match</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                        <div className="p-3 border-b">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input placeholder="Search ledger records..." className="pl-9" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Ref / Name</TableHead>
                                        <TableHead className="text-right">Received</TableHead>
                                        <TableHead className="text-right">Spent</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-gray-500">
                                            <p className="font-medium">No pending transactions</p>
                                            <p className="text-sm mt-1">All payments have been matched.</p>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
