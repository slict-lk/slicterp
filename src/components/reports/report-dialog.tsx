'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { exportToCSV } from '@/lib/export-utils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    report: {
        id: string;
        title: string;
        category: string;
    } | null;
}

export function ReportDialog({ open, onOpenChange, report }: ReportDialogProps) {
    const [loading, setLoading] = useState(false);
    const [format, setFormat] = useState<'csv' | 'pdf'>('csv');

    // Default to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);

    const handleGenerate = async () => {
        if (!report) return;
        setLoading(true);

        try {
            const queryParams = new URLSearchParams({
                startDate,
                endDate,
                format,
                category: report.category
            });

            const response = await fetch(`/api/reports/${report.id}?${queryParams}`);

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();

                if (data.error) {
                    toast.error(data.error);
                    return;
                }

                // Handle Client Side Export if JSON is returned
                if (format === 'csv') {
                    if (Array.isArray(data.data) && data.data.length > 0) {
                        exportToCSV(data.data, `${report.id}-${startDate}-to-${endDate}`);
                        toast.success(`Report ${report.title} generated successfully!`);
                    } else {
                        toast.warning("No data found for the selected range.");
                    }
                } else {
                    toast.info("PDF generation is not yet supported for this report type.");
                }

            } else {
                // It's a file stream (blob) - likely for server-side generated PDF/Excel
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${report.id}-${startDate}-to-${endDate}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success(`Report ${report.title} downloaded successfully!`);
            }

            onOpenChange(false);
        } catch (error) {
            console.error('Failed to generate report', error);
            toast.error('Failed to generate report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Generate Report</DialogTitle>
                    <DialogDescription>
                        Configure parameters for <strong>{report?.title}</strong>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="start-date">Start Date</Label>
                            <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="end-date">End Date</Label>
                            <Input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="format">Export Format</Label>
                        <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                            <SelectTrigger id="format">
                                <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                                <SelectItem value="pdf" disabled>PDF (Document) - Coming Soon</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleGenerate} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Generating...' : 'Download Report'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
