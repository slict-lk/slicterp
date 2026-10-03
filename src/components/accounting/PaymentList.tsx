'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, ArrowDownCircle, ArrowUpCircle, DollarSign } from 'lucide-react';

interface Payment {
  id: string;
  type: 'RECEIVED' | 'SENT';
  amount: number;
  paymentDate: Date;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CHECK' | 'OTHER';
  reference?: string;
  customerId?: string;
  customer?: {
    id: string;
    name: string;
  };
  vendorId?: string;
  vendor?: {
    id: string;
    name: string;
  };
  invoiceId?: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
  };
  notes?: string;
  createdAt: Date;
}

interface PaymentListProps {
  payments: Payment[];
  onCreateNew: () => void;
  onEdit: (payment: Payment) => void;
  onDelete: (paymentId: string) => void;
  onView: (payment: Payment) => void;
}

const METHOD_LABELS = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CREDIT_CARD: 'Credit Card',
  CHECK: 'Check',
  OTHER: 'Other',
};

export function PaymentList({
  payments,
  onCreateNew,
  onEdit,
  onDelete,
  onView,
}: PaymentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || payment.type === filterType;

    return matchesSearch && matchesType;
  });

  const totalReceived = filteredPayments
    .filter((p) => p.type === 'RECEIVED')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalSent = filteredPayments
    .filter((p) => p.type === 'SENT')
    .reduce((sum, p) => sum + p.amount, 0);

  const netCashFlow = totalReceived - totalSent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
          <p className="text-gray-600">{filteredPayments.length} transactions</p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Received</p>
                <p className="text-2xl font-bold text-green-600">${totalReceived.toFixed(2)}</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Sent</p>
                <p className="text-2xl font-bold text-red-600">${totalSent.toFixed(2)}</p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
                <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${netCashFlow.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'ALL' ? 'default' : 'outline'}
                onClick={() => setFilterType('ALL')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'RECEIVED' ? 'default' : 'outline'}
                onClick={() => setFilterType('RECEIVED')}
              >
                Received
              </Button>
              <Button
                variant={filterType === 'SENT' ? 'default' : 'outline'}
                onClick={() => setFilterType('SENT')}
              >
                Sent
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment List */}
      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterType !== 'ALL'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by recording your first payment'}
              </p>
              {!searchTerm && filterType === 'ALL' && (
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Party
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onView(payment)}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {payment.type === 'RECEIVED' ? (
                            <>
                              <ArrowDownCircle className="h-4 w-4 text-green-600 mr-2" />
                              <span className="text-sm font-medium text-green-600">Received</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpCircle className="h-4 w-4 text-red-600 mr-2" />
                              <span className="text-sm font-medium text-red-600">Sent</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {payment.customer?.name || payment.vendor?.name || '-'}
                        </div>
                        {payment.invoice && (
                          <div className="text-xs text-gray-500">
                            Invoice: {payment.invoice.invoiceNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{payment.reference || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {METHOD_LABELS[payment.paymentMethod]}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className={`text-sm font-bold ${payment.type === 'RECEIVED' ? 'text-green-600' : 'text-red-600'}`}>
                          {payment.type === 'RECEIVED' ? '+' : '-'}${payment.amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(payment);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this payment?')) onDelete(payment.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
