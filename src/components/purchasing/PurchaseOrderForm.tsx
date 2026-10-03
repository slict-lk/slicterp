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

const purchaseOrderLineSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
  tax: z.number().min(0).max(100).optional(),
});

const purchaseOrderSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  orderDate: z.string(),
  expectedDate: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CANCELLED']),
  notes: z.string().optional(),
  lines: z.array(purchaseOrderLineSchema).min(1, 'At least one line item is required'),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

interface Vendor {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  listPrice: number;
}

interface PurchaseOrderFormProps {
  initialData?: Partial<PurchaseOrderFormData> & { id?: string; orderNumber?: string };
  vendors: Vendor[];
  products: Product[];
  onSubmit: (data: PurchaseOrderFormData) => Promise<void>;
  onCancel: () => void;
}

export function PurchaseOrderForm({
  initialData,
  vendors,
  products,
  onSubmit,
  onCancel,
}: PurchaseOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      vendorId: initialData?.vendorId || '',
      orderDate: initialData?.orderDate || new Date().toISOString().split('T')[0],
      expectedDate: initialData?.expectedDate || '',
      status: initialData?.status || 'DRAFT',
      notes: initialData?.notes || '',
      lines: initialData?.lines || [{ description: '', quantity: 1, unitPrice: 0, tax: 0 }],
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
    const tax = line.tax || 0;

    const subtotal = quantity * unitPrice;
    const taxAmount = (subtotal * tax) / 100;

    return subtotal + taxAmount;
  };

  const subtotal = lines.reduce((sum, line) => {
    return sum + (line.quantity || 0) * (line.unitPrice || 0);
  }, 0);

  const totalTax = lines.reduce((sum, line) => {
    const lineSubtotal = (line.quantity || 0) * (line.unitPrice || 0);
    return sum + (lineSubtotal * (line.tax || 0)) / 100;
  }, 0);

  const total = subtotal + totalTax;

  const onFormSubmit = async (data: PurchaseOrderFormData) => {
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
      {/* PO Header */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initialData?.orderNumber && (
              <div>
                <Label>PO Number</Label>
                <Input value={initialData.orderNumber} disabled />
              </div>
            )}

            <div>
              <Label htmlFor="vendorId">Vendor *</Label>
              <Select
                value={watch('vendorId')}
                onValueChange={(value) => setValue('vendorId', value)}
              >
                <SelectTrigger className={errors.vendorId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vendorId && (
                <p className="text-sm text-red-500 mt-1">{errors.vendorId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="orderDate">Order Date *</Label>
              <Input id="orderDate" type="date" {...register('orderDate')} />
            </div>

            <div>
              <Label htmlFor="expectedDate">Expected Delivery Date</Label>
              <Input id="expectedDate" type="date" {...register('expectedDate')} />
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
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PO Lines */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Order Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: '', quantity: 1, unitPrice: 0, tax: 0 })}
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <Label>Tax (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.tax`, { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div className="md:col-span-3 flex items-end">
                    <div className="text-right w-full">
                      <Label>Line Total</Label>
                      <p className="text-lg font-bold">
                        ${calculateLineSubtotal(lines[index]).toFixed(2)}
                      </p>
                    </div>
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
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Update PO' : 'Create Purchase Order'}
        </Button>
      </div>
    </form>
  );
}
