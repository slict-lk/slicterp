"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    BarChart3,
    Download,
    FileText,
    TrendingUp,
    Users,
    Package,
    Calendar,
    DollarSign,
    Loader2,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportType {
    id: string;
    name: string;
    description: string;
    icon: typeof BarChart3;
    color: string;
}

const reportTypes: ReportType[] = [
    {
        id: 'sales-summary',
        name: 'Sales Summary',
        description: 'Revenue, profit, and transaction metrics',
        icon: DollarSign,
        color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    },
    {
        id: 'top-products',
        name: 'Top Products',
        description: 'Best selling products by quantity and revenue',
        icon: TrendingUp,
        color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    },
    {
        id: 'customer-analysis',
        name: 'Customer Analysis',
        description: 'Customer spending patterns and loyalty',
        icon: Users,
        color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
    },
    {
        id: 'inventory-status',
        name: 'Inventory Status',
        description: 'Stock levels, low stock, and dead stock',
        icon: Package,
        color: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    },
    {
        id: 'daily-sales',
        name: 'Daily Sales Report',
        description: 'Detailed daily transaction breakdown',
        icon: Calendar,
        color: 'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400',
    },
    {
        id: 'profit-margin',
        name: 'Profit Margin Analysis',
        description: 'Product and category profitability',
        icon: BarChart3,
        color: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-400',
    },
];

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function ReportsPage() {
        const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [generating, setGenerating] = useState(false);
    const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
    const [reportMeta, setReportMeta] = useState<{ reportType: string; generatedAt: string } | null>(null);

    const handleGenerate = async () => {
        if (!selectedReport) return;

        setGenerating(true);
        setReportData(null);

        try {
            const params = new URLSearchParams({
                type: selectedReport,
                ...(dateFrom && { dateFrom }),
                ...(dateTo && { dateTo }),
            });

            const res = await fetch(`/api/spareparts/reports?${params}`);
            if (res.ok) {
                const data = await res.json();
                setReportData(data.data);
                setReportMeta({ reportType: data.reportType, generatedAt: data.generatedAt });
                toast.success('Report Generated', { description: `${reportTypes.find(r => r.id === selectedReport)?.name} is ready` });
            } else {
                throw new Error('Failed to generate report');
            }
        } catch (error) {
            toast.error('Error', { description: 'Failed to generate report' });
        } finally {
            setGenerating(false);
        }
    };

    const exportToCSV = () => {
        if (!reportData || !reportMeta) return;

        let csvContent = '';
        const reportName = reportTypes.find(r => r.id === reportMeta.reportType)?.name || 'Report';

        // Simple CSV generation based on report type
        if (reportMeta.reportType === 'inventory-status') {
            const data = reportData as any;
            csvContent = 'SKU,Name,Category,Stock,Min Stock,Status\n';
            [...(data.lowStockItems || []), ...(data.outOfStockItems || [])].forEach((item: any) => {
                csvContent += `${item.sku},"${item.name}",${item.category || ''},${item.stockQty},${item.minStockQty},${item.stockQty === 0 ? 'Out of Stock' : 'Low Stock'}\n`;
            });
        } else if (reportMeta.reportType === 'top-products') {
            const data = reportData as any;
            csvContent = 'SKU,Name,Quantity Sold,Revenue\n';
            (data.topByRevenue || []).forEach((item: any) => {
                csvContent += `${item.productSku},"${item.productName}",${item.totalQuantity},${item.totalRevenue}\n`;
            });
        }

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const exportToPDF = () => {
        if (!reportData || !reportMeta) return;

        const doc = new jsPDF();
        const data = reportData as any;
        const reportName = reportTypes.find(r => r.id === reportMeta.reportType)?.name || 'Report';

        // Add title
        doc.setFontSize(18);
        doc.text(reportName, 105, 15, { align: 'center' });

        // Add generation date
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date(reportMeta.generatedAt).toLocaleString()}`, 105, 23, { align: 'center' });

        let startY = 35;

        // Generate PDF based on report type
        switch (reportMeta.reportType) {
            case 'sales-summary':
                doc.setFontSize(12);
                doc.text('Summary', 20, startY);
                startY += 8;
                doc.setFontSize(10);
                doc.text(`Total Revenue: ${formatCurrency(data.summary?.totalRevenue || 0)}`, 20, startY);
                startY += 6;
                doc.text(`Total Profit: ${formatCurrency(data.summary?.totalProfit || 0)}`, 20, startY);
                startY += 6;
                doc.text(`Transactions: ${data.summary?.totalTransactions || 0}`, 20, startY);
                startY += 6;
                doc.text(`Profit Margin: ${data.summary?.profitMargin || 0}%`, 20, startY);
                break;

            case 'top-products':
                autoTable(doc, {
                    startY: startY,
                    head: [['Product', 'SKU', 'Qty Sold', 'Revenue', 'Profit']],
                    body: (data.topByRevenue || []).map((item: any) => [
                        item.productName,
                        item.productSku,
                        item.totalQuantity,
                        formatCurrency(item.totalRevenue),
                        formatCurrency(item.totalRevenue - item.totalCost)
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105] },
                    styles: { fontSize: 9 }
                });
                break;

            case 'customer-analysis':
                doc.setFontSize(10);
                doc.text(`Total Active Customers: ${data.totalActiveCustomers || 0}`, 20, startY);
                startY += 10;
                autoTable(doc, {
                    startY: startY,
                    head: [['Customer', 'Customer #', 'Type', 'Transactions', 'Total Spent']],
                    body: (data.topCustomers || []).map((customer: any) => [
                        customer.name,
                        customer.customerNumber,
                        customer.customerType,
                        customer.transactionCount,
                        formatCurrency(customer.totalSpent)
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105] },
                    styles: { fontSize: 9 }
                });
                break;

            case 'inventory-status':
                doc.setFontSize(12);
                doc.text('Summary', 20, startY);
                startY += 8;
                doc.setFontSize(10);
                doc.text(`Total Products: ${data.summary?.totalProducts || 0}`, 20, startY);
                startY += 6;
                doc.text(`Stock Value: ${formatCurrency(data.summary?.totalStockValue || 0)}`, 20, startY);
                startY += 6;
                doc.text(`Low Stock: ${data.summary?.lowStockCount || 0}`, 20, startY);
                startY += 6;
                doc.text(`Out of Stock: ${data.summary?.outOfStockCount || 0}`, 20, startY);
                startY += 10;

                autoTable(doc, {
                    startY: startY,
                    head: [['Product', 'SKU', 'Category', 'Stock', 'Min Stock', 'Status']],
                    body: [...(data.outOfStockItems || []), ...(data.lowStockItems || [])].map((item: any) => [
                        item.name,
                        item.sku,
                        item.category || '—',
                        item.stockQty,
                        item.minStockQty,
                        item.stockQty === 0 ? 'Out of Stock' : 'Low Stock'
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105] },
                    styles: { fontSize: 9 }
                });
                break;

            case 'daily-sales':
                doc.setFontSize(10);
                doc.text(`Total Days: ${data.totalDays || 0} • Average Daily Revenue: ${formatCurrency(data.averageDailyRevenue || 0)}`, 20, startY);
                startY += 10;
                autoTable(doc, {
                    startY: startY,
                    head: [['Date', 'Transactions', 'Revenue']],
                    body: (data.dailySales || []).map((day: any) => [
                        day.date,
                        day.transactions,
                        formatCurrency(day.revenue)
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105] },
                    styles: { fontSize: 9 }
                });
                break;

            case 'profit-margin':
                autoTable(doc, {
                    startY: startY,
                    head: [['Product', 'SKU', 'Revenue', 'Cost', 'Profit', 'Margin %']],
                    body: (data.topByProfit || []).map((item: any) => [
                        item.productName,
                        item.productSku,
                        formatCurrency(item.totalRevenue),
                        formatCurrency(item.totalCost),
                        formatCurrency(item.totalProfit),
                        `${item.marginPercent}%`
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105] },
                    styles: { fontSize: 9 }
                });
                break;
        }

        // Save the PDF
        doc.save(`${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const setPresetRange = (preset: string) => {
        const today = new Date();
        let from = new Date();

        switch (preset) {
            case 'today':
                from = today;
                break;
            case 'week':
                from.setDate(today.getDate() - 7);
                break;
            case 'month':
                from.setMonth(today.getMonth() - 1);
                break;
            case 'quarter':
                from.setMonth(today.getMonth() - 3);
                break;
            case 'year':
                from.setFullYear(today.getFullYear() - 1);
                break;
        }

        setDateFrom(from.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
    };

    const renderReportContent = () => {
        if (!reportData || !reportMeta) return null;

        const data = reportData as any;

        switch (reportMeta.reportType) {
            case 'sales-summary':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-gray-500">Total Revenue</p>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(data.summary?.totalRevenue || 0)}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-gray-500">Total Profit</p>
                                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.summary?.totalProfit || 0)}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-gray-500">Transactions</p>
                                    <p className="text-2xl font-bold">{data.summary?.totalTransactions || 0}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-gray-500">Profit Margin</p>
                                    <p className="text-2xl font-bold text-purple-600">{data.summary?.profitMargin || 0}%</p>
                                </CardContent>
                            </Card>
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Payment Status Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4">
                                    <Badge className="bg-green-100 text-green-700">Paid: {data.byPaymentStatus?.paid || 0}</Badge>
                                    <Badge className="bg-yellow-100 text-yellow-700">Partial: {data.byPaymentStatus?.partial || 0}</Badge>
                                    <Badge className="bg-red-100 text-red-700">Unpaid: {data.byPaymentStatus?.unpaid || 0}</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case 'top-products':
                return (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Products by Revenue</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Qty Sold</TableHead>
                                            <TableHead className="text-right">Revenue</TableHead>
                                            <TableHead className="text-right">Profit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(data.topByRevenue || []).map((item: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{item.productName}</p>
                                                        <p className="text-sm text-gray-500">{item.productSku}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{item.totalQuantity}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.totalRevenue)}</TableCell>
                                                <TableCell className="text-right text-green-600">
                                                    {formatCurrency(item.totalRevenue - item.totalCost)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );

            case 'customer-analysis':
                return (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Customers by Spending</CardTitle>
                                <CardDescription>{data.totalActiveCustomers || 0} active customers in period</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Transactions</TableHead>
                                            <TableHead className="text-right">Total Spent</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(data.topCustomers || []).map((customer: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{customer.name}</p>
                                                        <p className="text-sm text-gray-500">{customer.customerNumber}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{customer.customerType}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{customer.transactionCount}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(customer.totalSpent)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );

            case 'inventory-status':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-gray-500">Total Products</p>
                                    <p className="text-2xl font-bold">{data.summary?.totalProducts || 0}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-gray-500">Stock Value</p>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(data.summary?.totalStockValue || 0)}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-gray-500">Low Stock</p>
                                    <p className="text-2xl font-bold text-orange-600">{data.summary?.lowStockCount || 0}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-gray-500">Out of Stock</p>
                                    <p className="text-2xl font-bold text-red-600">{data.summary?.outOfStockCount || 0}</p>
                                </CardContent>
                            </Card>
                        </div>
                        {(data.lowStockItems?.length > 0 || data.outOfStockItems?.length > 0) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Items Requiring Attention</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead className="text-right">Stock</TableHead>
                                                <TableHead className="text-right">Min Stock</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {[...(data.outOfStockItems || []), ...(data.lowStockItems || [])].map((item: any, i: number) => (
                                                <TableRow key={i}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{item.name}</p>
                                                            <p className="text-sm text-gray-500">{item.sku}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{item.category || '—'}</TableCell>
                                                    <TableCell className="text-right">{item.stockQty}</TableCell>
                                                    <TableCell className="text-right">{item.minStockQty}</TableCell>
                                                    <TableCell>
                                                        <Badge className={item.stockQty === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}>
                                                            {item.stockQty === 0 ? 'Out of Stock' : 'Low Stock'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                );

            case 'daily-sales':
                return (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Daily Sales Breakdown</CardTitle>
                                <CardDescription>
                                    {data.totalDays || 0} days • Avg: {formatCurrency(data.averageDailyRevenue || 0)}/day
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Transactions</TableHead>
                                            <TableHead className="text-right">Revenue</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(data.dailySales || []).map((day: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{day.date}</TableCell>
                                                <TableCell className="text-right">{day.transactions}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(day.revenue)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );

            case 'profit-margin':
                return (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Products by Profit</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Revenue</TableHead>
                                            <TableHead className="text-right">Cost</TableHead>
                                            <TableHead className="text-right">Profit</TableHead>
                                            <TableHead className="text-right">Margin %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(data.topByProfit || []).map((item: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{item.productName}</p>
                                                        <p className="text-sm text-gray-500">{item.productSku}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.totalRevenue)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.totalCost)}</TableCell>
                                                <TableCell className="text-right text-green-600 font-medium">
                                                    {formatCurrency(item.totalProfit)}
                                                </TableCell>
                                                <TableCell className="text-right">{item.marginPercent}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                );

            default:
                return <p>Report data not available</p>;
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <BarChart3 className="h-8 w-8 text-primary" />
                    Reports
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Generate and view business intelligence reports
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Report Selection */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Report Type</CardTitle>
                            <CardDescription>Choose the report you want to generate</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {reportTypes.map((report) => {
                                    const Icon = report.icon;
                                    const isSelected = selectedReport === report.id;
                                    return (
                                        <div
                                            key={report.id}
                                            onClick={() => { setSelectedReport(report.id); setReportData(null); }}
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                                ? 'border-primary bg-primary/5'
                                                : 'border-transparent bg-gray-50 dark:bg-gray-800 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-lg ${report.color} flex items-center justify-center`}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                                        {report.name}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">{report.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Report Options */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Report Options</CardTitle>
                            <CardDescription>Configure and generate</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Date Range */}
                            <div className="space-y-2">
                                <Label>Quick Range</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['today', 'week', 'month', 'quarter', 'year'].map((preset) => (
                                        <Button
                                            key={preset}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPresetRange(preset)}
                                        >
                                            {preset.charAt(0).toUpperCase() + preset.slice(1)}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dateFrom">From</Label>
                                    <Input
                                        id="dateFrom"
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dateTo">To</Label>
                                    <Input
                                        id="dateTo"
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Generate Button */}
                            <Button
                                className="w-full"
                                disabled={!selectedReport || generating}
                                onClick={handleGenerate}
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Generate Report
                                    </>
                                )}
                            </Button>

                            {reportData && (
                                <div className="space-y-2">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={exportToPDF}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Export PDF
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={exportToCSV}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Export CSV
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Report Results */}
            {reportData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>{reportTypes.find(r => r.id === reportMeta?.reportType)?.name}</span>
                            {reportMeta && (
                                <span className="text-sm font-normal text-gray-500">
                                    Generated: {new Date(reportMeta.generatedAt).toLocaleString()}
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {renderReportContent()}
                    </CardContent>
                </Card>
            )}

            {!reportData && !generating && (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Select a report and click Generate</p>
                            <p className="text-sm">Reports will display real data from your sales, inventory, and customers</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
