'use client';

import { useState, useEffect } from 'react';
import { PaymentList } from '@/components/accounting/PaymentList';
import { PaymentForm } from '@/components/accounting/PaymentForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

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

interface Customer {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayments();
    loadCustomers();
    loadVendors();
    loadInvoices();
  }, []);

  const loadPayments = async () => {
    try {
      const response = await fetch('/api/accounting/payments');
      if (response.ok) {
        const data = await response.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/sales/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadVendors = async () => {
    try {
      const response = await fetch('/api/purchasing/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const response = await fetch('/api/accounting/invoices?status=OPEN');
      if (response.ok) {
        const data = await response.json();
        setInvoices(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  };

  const handleCreatePayment = async (data: any) => {
    try {
      const response = await fetch('/api/accounting/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadPayments();
        setViewMode('list');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to create payment');
    }
  };

  const handleUpdatePayment = async (data: any) => {
    if (!selectedPayment) return;

    try {
      const response = await fetch(`/api/accounting/payments/${selectedPayment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadPayments();
        setViewMode('list');
        setSelectedPayment(null);
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Failed to update payment');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/accounting/payments/${paymentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadPayments();
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Failed to delete payment');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading payments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {viewMode === 'list' ? (
        <PaymentList
          payments={payments}
          onCreateNew={() => setViewMode('create')}
          onEdit={(payment) => {
            setSelectedPayment(payment);
            setViewMode('edit');
          }}
          onDelete={handleDeletePayment}
          onView={(payment) => {
            setSelectedPayment(payment);
            setViewMode('edit');
          }}
        />
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payments
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-6">
            {viewMode === 'create' ? 'Record Payment' : 'Edit Payment'}
          </h1>
          <PaymentForm
            initialData={selectedPayment ? {
              ...selectedPayment,
              paymentDate: (() => {
                const pd = selectedPayment.paymentDate;
                if (pd == null) return undefined;
                if (typeof pd === 'string') {
                  const ms = Date.parse(pd);
                  return Number.isFinite(ms) ? new Date(ms).toISOString().split('T')[0] : undefined;
                }
                if (pd instanceof Date && !isNaN(pd.getTime())) {
                  return pd.toISOString().split('T')[0];
                }
                const d = new Date(pd as any);
                return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : undefined;
              })()
            } : undefined}
            customers={customers}
            vendors={vendors}
            invoices={invoices}
            onSubmit={viewMode === 'create' ? handleCreatePayment : handleUpdatePayment}
            onCancel={() => setViewMode('list')}
          />
        </div>
      )}
    </div>
  );
}
