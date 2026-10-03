'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  ShoppingCart,
  Download,
  Calendar
} from 'lucide-react';
import { ReportDialog } from '@/components/reports/report-dialog';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  category: 'financial' | 'sales' | 'inventory' | 'hr';
  icon: any;
}

export default function ReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<ReportCard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const reports: ReportCard[] = [
    // Financial Reports
    {
      id: 'profit-loss',
      title: 'Profit & Loss Statement',
      description: 'Income, expenses, and net profit over time',
      category: 'financial',
      icon: DollarSign,
    },
    {
      id: 'balance-sheet',
      title: 'Balance Sheet',
      description: 'Assets, liabilities, and equity snapshot',
      category: 'financial',
      icon: FileText,
    },
    {
      id: 'cash-flow',
      title: 'Cash Flow Statement',
      description: 'Cash inflows and outflows analysis',
      category: 'financial',
      icon: TrendingUp,
    },
    {
      id: 'aged-receivables',
      title: 'Aged Receivables',
      description: 'Outstanding invoices by aging period',
      category: 'financial',
      icon: DollarSign,
    },

    // Sales Reports
    {
      id: 'sales-analysis',
      title: 'Sales Analysis',
      description: 'Revenue trends and sales performance',
      category: 'sales',
      icon: ShoppingCart,
    },
    {
      id: 'customer-analysis',
      title: 'Customer Analysis',
      description: 'Top customers and buying patterns',
      category: 'sales',
      icon: Users,
    },
    {
      id: 'product-sales',
      title: 'Product Sales Report',
      description: 'Best and worst performing products',
      category: 'sales',
      icon: Package,
    },
    {
      id: 'sales-forecast',
      title: 'Sales Forecast',
      description: 'Projected sales based on pipeline',
      category: 'sales',
      icon: TrendingUp,
    },

    // Inventory Reports
    {
      id: 'stock-valuation',
      title: 'Stock Valuation',
      description: 'Total inventory value by warehouse',
      category: 'inventory',
      icon: Package,
    },
    {
      id: 'stock-movement',
      title: 'Stock Movement History',
      description: 'Detailed movement transactions',
      category: 'inventory',
      icon: Package,
    },
    {
      id: 'low-stock',
      title: 'Low Stock Alert',
      description: 'Products below reorder level',
      category: 'inventory',
      icon: Package,
    },
    {
      id: 'warehouse-analysis',
      title: 'Warehouse Analysis',
      description: 'Stock distribution across warehouses',
      category: 'inventory',
      icon: Package,
    },

    // HR Reports
    {
      id: 'attendance-summary',
      title: 'Attendance Summary',
      description: 'Employee attendance statistics',
      category: 'hr',
      icon: Calendar,
    },
    {
      id: 'leave-balance',
      title: 'Leave Balance Report',
      description: 'Available and used leave by employee',
      category: 'hr',
      icon: Users,
    },
    {
      id: 'payroll-summary',
      title: 'Payroll Summary',
      description: 'Monthly payroll breakdown',
      category: 'hr',
      icon: DollarSign,
    },
    {
      id: 'employee-turnover',
      title: 'Employee Turnover',
      description: 'Hiring and attrition trends',
      category: 'hr',
      icon: Users,
    },
  ];

  const filteredReports = selectedCategory === 'all'
    ? reports
    : reports.filter(r => r.category === selectedCategory);

  const handleGenerateReport = (report: ReportCard) => {
    setSelectedReport(report);
    setDialogOpen(true);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      financial: 'bg-green-100 text-green-800',
      sales: 'bg-blue-100 text-blue-800',
      inventory: 'bg-purple-100 text-purple-800',
      hr: 'bg-orange-100 text-orange-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600">Generate insights and detailed reports for your business</p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('all')}
        >
          All Reports
        </Button>
        <Button
          variant={selectedCategory === 'financial' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('financial')}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Financial
        </Button>
        <Button
          variant={selectedCategory === 'sales' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('sales')}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Sales
        </Button>
        <Button
          variant={selectedCategory === 'inventory' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('inventory')}
        >
          <Package className="h-4 w-4 mr-2" />
          Inventory
        </Button>
        <Button
          variant={selectedCategory === 'hr' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('hr')}
        >
          <Users className="h-4 w-4 mr-2" />
          HR
        </Button>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((report) => {
          const IconComponent = report.icon;
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getCategoryColor(report.category)}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{report.title}</CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">{report.description}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleGenerateReport(report)}
                  >
                    <FileText className="h-3 w-3 mr-2" />
                    Generate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateReport(report)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredReports.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600">Try selecting a different category</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Report Generation Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">16</p>
              <p className="text-sm text-gray-600">Available Reports</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-900">4</p>
              <p className="text-sm text-blue-600">Financial Reports</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-900">4</p>
              <p className="text-sm text-green-600">Sales Reports</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-900">8</p>
              <p className="text-sm text-purple-600">Operational Reports</p>
            </div>
          </div>
        </CardContent>

      </Card>

      <ReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        report={selectedReport}
      />
    </div >
  );
}
