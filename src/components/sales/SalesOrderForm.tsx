'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, Plus, Trash2 } from 'lucide-react';

const salesOrderLineSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Price must be non-negative'),
  discount: z.number().min(0).max(100).optional(),
  tax: z.number().min(0).max(100).optional(),
});

const salesOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  orderDate: z.string(),
  deliveryDate: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']),
  notes: z.string().optional(),
  lines: z.array(salesOrderLineSchema).min(1, 'At least one line item is required'),
});

type SalesOrderFormData = z.infer<typeof salesOrderSchema>;

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  listPrice: number;
}

interface SalesOrderFormProps {
  initialData?: Partial<SalesOrderFormData> & { id?: string; orderNumber?: string };
  customers: Customer[];
  products: Product[];
  onSubmit: (data: SalesOrderFormData) => Promise<void>;
  onCancel: () => void;
}

export function SalesOrderForm({
  initialData,
  customers,
  products,
  onSubmit,
  onCancel,
}: SalesOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<SalesOrderFormData>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      customerId: initialData?.customerId || '',
      orderDate: initialData?.orderDate || new Date().toISOString().split('T')[0],
      deliveryDate: initialData?.deliveryDate || '',
      status: initialData?.status || 'DRAFT',
      notes: initialData?.notes || '',
      lines: initialData?.lines || [{ productId: '', quantity: 1, unitPrice: 0, discount: 0, tax: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  const lines = watch('lines');
  const status = watch('status');

  // Calculate totals
  const calculateLineSubtotal = (line: any) => {
    const quantity = line.quantity || 0;
    const unitPrice = line.unitPrice || 0;
    const discount = line.discount || 0;
    const tax = line.tax || 0;

    const subtotal = quantity * unitPrice;
    const discountAmount = (subtotal * discount) / 100;
    const taxAmount = ((subtotal - discountAmount) * tax) / 100;

    return subtotal - discountAmount + taxAmount;
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

  const onFormSubmit = async (data: SalesOrderFormData) => {
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
      setValue(`lines.${index}.unitPrice`, product.listPrice);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Order Header */}
      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initialData?.orderNumber && (
              <div>
                <Label>Order Number</Label>
                <Input value={initialData.orderNumber} disabled />
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
              <Label htmlFor="orderDate">Order Date *</Label>
              <Input
                id="orderDate"
                type="date"
                {...register('orderDate')}
                className={errors.orderDate ? 'border-red-500' : ''}
              />
            </div>

            <div>
              <Label htmlFor="deliveryDate">Expected Delivery Date</Label>
              <Input id="deliveryDate" type="date" {...register('deliveryDate')} />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setValue('status', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Lines */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Order Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ productId: '', quantity: 1, unitPrice: 0, discount: 0, tax: 0 })
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

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <Label>Product *</Label>
                    <Select
                      value={watch(`lines.${index}.productId`)}
                      onValueChange={(value) => handleProductChange(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} {product.sku ? `(${product.sku})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <Label>Tax (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`lines.${index}.tax`, { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div className="md:col-span-4 flex items-end">
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
            {errors.lines && (
              <p className="text-sm text-red-500">{errors.lines.message}</p>
            )}
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
                  <span className="text-gray-600">Discount:</span>
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

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Input {...register('notes')} placeholder="Enter any additional notes..." />
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
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Order' : 'Create Order'}
        </Button>
      </div>
    </form>
  );
}
