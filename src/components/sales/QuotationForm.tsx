'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, Plus, Trash2 } from 'lucide-react';

const quotationLineSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100).optional(),
  tax: z.number().min(0).max(100).optional(),
});

const quotationSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  validUntil: z.string(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  lines: z.array(quotationLineSchema).min(1, 'At least one line item is required'),
});

type QuotationFormData = z.infer<typeof quotationSchema>;

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  listPrice: number;
}

interface QuotationFormProps {
  initialData?: Partial<QuotationFormData> & { id?: string; quotationNumber?: string };
  customers: Customer[];
  products: Product[];
  onSubmit: (data: QuotationFormData) => Promise<void>;
  onCancel: () => void;
}

export function QuotationForm({
  initialData,
  customers,
  products,
  onSubmit,
  onCancel,
}: QuotationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      customerId: initialData?.customerId || '',
      validUntil:
        initialData?.validUntil ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: initialData?.status || 'DRAFT',
      notes: initialData?.notes || '',
      termsAndConditions: initialData?.termsAndConditions || '',
      lines: initialData?.lines || [{ description: '', quantity: 1, unitPrice: 0, discount: 0, tax: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  const lines = watch('lines');
  const status = watch('status');

  const calculateLineSubtotal = (line: any) => {
    const quantity = line.quantity || 0;
    const unitPrice = line.unitPrice || 0;
    const discount = line.discount || 0;
    const tax = line.tax || 0;

    const subtotal = quantity * unitPrice;
    const discountAmount = (subtotal * discount) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * tax) / 100;

    return afterDiscount + taxAmount;
  };

  const subtotal = lines.reduce((sum, line) => {
    return sum + (line.quantity || 0) * (line.unitPrice || 0);
  }, 0);

  const totalDiscount = lines.reduce((sum, line) => {
    const lineSubtotal = (line.quantity || 0) * (line.unitPrice || 0);
    return sum + (lineSubtotal * (line.discount || 0)) / 100;
  }, 0);

  const totalTax = lines.reduce((sum, line) => {
    const lineSubtotal = (line.quantity || 0) * (line.unitPrice || 0);
    const afterDiscount = lineSubtotal - (lineSubtotal * (line.discount || 0)) / 100;
    return sum + (afterDiscount * (line.tax || 0)) / 100;
  }, 0);

  const total = subtotal - totalDiscount + totalTax;

  const onFormSubmit = async (data: QuotationFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setValue(`lines.${index}.productId`, productId);
      setValue(`lines.${index}.description`, product.name);
      setValue(`lines.${index}.unitPrice`, product.listPrice);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Quotation Header */}
      <Card>
        <CardHeader>
          <CardTitle>Quotation Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initialData?.quotationNumber && (
              <div>
                <Label>Quotation Number</Label>
                <Input value={initialData.quotationNumber} disabled />
              </div>
            )}

            <div>
              <Label htmlFor="customerId">Customer *</Label>
              <Select
                value={watch('customerId')}
                onValueChange={(value) => setValue('customerId', value)}
              >
                <SelectTrigger className={errors.customerId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && (
                <p className="text-sm text-red-500 mt-1">{errors.customerId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="validUntil">Valid Until *</Label>
              <Input id="validUntil" type="date" {...register('validUntil')} />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setValue('status', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotation Lines */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ description: '', quantity: 1, unitPrice: 0, discount: 0, tax: 0 })
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Item {index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <Label>Description *</Label>
                    <Input
                      {...register(`lines.${index}.description`)}
                      placeholder="Item description"
                    />
                  </div>

                  <div>
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
                      placeholder="1"
                    />
                  </div>

                  <div>
                    <Label>Unit Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label>Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.discount`, { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label>Tax (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.tax`, { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div className="md:col-span-6 text-right">
                    <Label>Line Total</Label>
                    <p className="text-lg font-bold">
                      ${calculateLineSubtotal(lines[index]).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {errors.lines && <p className="text-sm text-red-500">{errors.lines.message}</p>}
          </div>

          {/* Totals */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span className="font-medium">-${totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">${totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea {...register('notes')} placeholder="Internal notes..." rows={4} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register('termsAndConditions')}
              placeholder="Payment terms, delivery conditions..."
              rows={4}
            />
          </CardContent>
        </Card>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Quotation' : 'Create Quotation'}
        </Button>
      </div>
    </form>
  );
}
