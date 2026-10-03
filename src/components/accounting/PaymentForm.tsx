'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';

const paymentSchema = z.object({
  type: z.enum(['RECEIVED', 'SENT']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentDate: z.string(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHECK', 'OTHER']),
  reference: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
  invoiceId: z.string().optional(),
  billId: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

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

interface PaymentFormProps {
  initialData?: Partial<PaymentFormData> & { id?: string };
  customers: Customer[];
  vendors: Vendor[];
  invoices: Invoice[];
  onSubmit: (data: PaymentFormData) => Promise<void>;
  onCancel: () => void;
}

export function PaymentForm({
  initialData,
  customers,
  vendors,
  invoices,
  onSubmit,
  onCancel,
}: PaymentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      type: initialData?.type || 'RECEIVED',
      amount: initialData?.amount || 0,
      paymentDate: initialData?.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: initialData?.paymentMethod || 'BANK_TRANSFER',
      reference: initialData?.reference || '',
      customerId: initialData?.customerId || '',
      vendorId: initialData?.vendorId || '',
      invoiceId: initialData?.invoiceId || '',
      notes: initialData?.notes || '',
    },
  });

  const paymentType = watch('type');
  const paymentMethod = watch('paymentMethod');

  const onFormSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    try {
      // Clean sentinel 'none' values
      const cleaned = { ...data };
      if (cleaned.customerId === 'none') cleaned.customerId = undefined;
      if (cleaned.vendorId === 'none') cleaned.vendorId = undefined;
      if (cleaned.invoiceId === 'none') cleaned.invoiceId = undefined;
      await onSubmit(cleaned);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Payment Type *</Label>
              <Select
                value={paymentType}
                onValueChange={(value) => setValue('type', value as any)}
              >
                <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIVED">Payment Received (from Customer)</SelectItem>
                  <SelectItem value="SENT">Payment Sent (to Vendor)</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>}
            </div>

            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                placeholder="0.00"
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && (
                <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                {...register('paymentDate')}
                className={errors.paymentDate ? 'border-red-500' : ''}
              />
              {errors.paymentDate && (
                <p className="text-sm text-red-500 mt-1">{errors.paymentDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setValue('paymentMethod', value as any)}
              >
                <SelectTrigger className={errors.paymentMethod ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMethod && (
                <p className="text-sm text-red-500 mt-1">{errors.paymentMethod.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                {...register('reference')}
                placeholder="Transaction reference"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Records */}
      <Card>
        <CardHeader>
          <CardTitle>Related Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentType === 'RECEIVED' ? (
              <>
                <div>
                  <Label htmlFor="customerId">Customer</Label>
                  <Select
                    value={watch('customerId')}
                    onValueChange={(value) => setValue('customerId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {Array.isArray(customers) && customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="invoiceId">Invoice</Label>
                  <Select
                    value={watch('invoiceId')}
                    onValueChange={(value) => setValue('invoiceId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {Array.isArray(invoices) && invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - ${invoice.total.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="vendorId">Vendor</Label>
                <Select
                  value={watch('vendorId')}
                  onValueChange={(value) => setValue('vendorId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {Array.isArray(vendors) && vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea {...register('notes')} placeholder="Additional notes..." rows={3} />
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Payment' : 'Record Payment'}
        </Button>
      </div>
    </form>
  );
}
