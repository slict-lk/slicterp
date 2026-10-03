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

const stockMovementSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER']),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  toWarehouseId: z.string().optional(),
  reference: z.string().optional(),
  reason: z.string().optional(),
  movementDate: z.string(),
});

type StockMovementFormData = z.infer<typeof stockMovementSchema>;

interface Product {
  id: string;
  name: string;
  sku: string;
  qtyAvailable: number;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface StockMovementFormProps {
  initialData?: Partial<StockMovementFormData> & { id?: string };
  products: Product[];
  warehouses: Warehouse[];
  onSubmit: (data: StockMovementFormData) => Promise<void>;
  onCancel: () => void;
}

export function StockMovementForm({
  initialData,
  products,
  warehouses,
  onSubmit,
  onCancel,
}: StockMovementFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<StockMovementFormData>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      productId: initialData?.productId || '',
      warehouseId: initialData?.warehouseId || '',
      type: initialData?.type || 'IN',
      quantity: initialData?.quantity || 0,
      toWarehouseId: initialData?.toWarehouseId || '',
      reference: initialData?.reference || '',
      reason: initialData?.reason || '',
      movementDate: initialData?.movementDate || new Date().toISOString().split('T')[0],
    },
  });

  const movementType = watch('type');
  const selectedProductId = watch('productId');
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const onFormSubmit = async (data: StockMovementFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Movement Details */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Movement Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Movement Type *</Label>
              <Select
                value={movementType}
                onValueChange={(value) => setValue('type', value as any)}
              >
                <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Stock In (Receive)</SelectItem>
                  <SelectItem value="OUT">Stock Out (Issue)</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>}
            </div>

            <div>
              <Label htmlFor="movementDate">Date *</Label>
              <Input
                id="movementDate"
                type="date"
                {...register('movementDate')}
                className={errors.movementDate ? 'border-red-500' : ''}
              />
              {errors.movementDate && (
                <p className="text-sm text-red-500 mt-1">{errors.movementDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="productId">Product *</Label>
              <Select
                value={watch('productId')}
                onValueChange={(value) => setValue('productId', value)}
              >
                <SelectTrigger className={errors.productId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - Available: {product.qtyAvailable}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productId && (
                <p className="text-sm text-red-500 mt-1">{errors.productId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                {...register('quantity', { valueAsNumber: true })}
                placeholder="0.00"
                className={errors.quantity ? 'border-red-500' : ''}
              />
              {errors.quantity && (
                <p className="text-sm text-red-500 mt-1">{errors.quantity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="warehouseId">
                {movementType === 'TRANSFER' ? 'From Warehouse *' : 'Warehouse *'}
              </Label>
              <Select
                value={watch('warehouseId')}
                onValueChange={(value) => setValue('warehouseId', value)}
              >
                <SelectTrigger className={errors.warehouseId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.warehouseId && (
                <p className="text-sm text-red-500 mt-1">{errors.warehouseId.message}</p>
              )}
            </div>

            {movementType === 'TRANSFER' && (
              <div>
                <Label htmlFor="toWarehouseId">To Warehouse *</Label>
                <Select
                  value={watch('toWarehouseId')}
                  onValueChange={(value) => setValue('toWarehouseId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter((w) => w.id !== watch('warehouseId'))
                      .map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name} ({warehouse.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                {...register('reference')}
                placeholder="PO-001, SO-001, etc."
              />
            </div>
          </div>

          {selectedProduct && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm">
                <p className="font-medium text-blue-900">Current Stock Information</p>
                <p className="text-blue-700">
                  Available Quantity: <span className="font-bold">{selectedProduct.qtyAvailable}</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reason */}
      <Card>
        <CardHeader>
          <CardTitle>Reason/Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register('reason')}
            placeholder="Reason for stock movement..."
            rows={3}
          />
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
          {isSubmitting ? 'Processing...' : 'Record Movement'}
        </Button>
      </div>
    </form>
  );
}
