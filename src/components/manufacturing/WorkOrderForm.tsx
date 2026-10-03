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

const workOrderSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  bomId: z.string().optional(),
  quantityToManufacture: z.number().min(0.01, 'Quantity must be greater than 0'),
  startDate: z.string(),
  deadline: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'DONE', 'CANCELLED']),
  warehouseId: z.string().optional(),
  notes: z.string().optional(),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface BOM {
  id: string;
  bomNumber: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface WorkOrderFormProps {
  initialData?: Partial<WorkOrderFormData> & { id?: string; workOrderNumber?: string };
  products: Product[];
  boms: BOM[];
  warehouses: Warehouse[];
  onSubmit: (data: WorkOrderFormData) => Promise<void>;
  onCancel: () => void;
}

export function WorkOrderForm({
  initialData,
  products,
  boms,
  warehouses,
  onSubmit,
  onCancel,
}: WorkOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      productId: initialData?.productId || '',
      bomId: initialData?.bomId || '',
      quantityToManufacture: initialData?.quantityToManufacture || 1,
      startDate: initialData?.startDate || new Date().toISOString().split('T')[0],
      deadline: initialData?.deadline || '',
      status: initialData?.status || 'DRAFT',
      warehouseId: initialData?.warehouseId || '',
      notes: initialData?.notes || '',
    },
  });

  const status = watch('status');

  const onFormSubmit = async (data: WorkOrderFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Work Order Information */}
      <Card>
        <CardHeader>
          <CardTitle>Work Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initialData?.workOrderNumber && (
              <div>
                <Label>Work Order Number</Label>
                <Input value={initialData.workOrderNumber} disabled />
              </div>
            )}

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
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productId && (
                <p className="text-sm text-red-500 mt-1">{errors.productId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="bomId">Bill of Materials</Label>
              <Select
                value={watch('bomId')}
                onValueChange={(value) => setValue('bomId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select BOM (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {boms.map((bom) => (
                    <SelectItem key={bom.id} value={bom.id}>
                      {bom.name} ({bom.bomNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantityToManufacture">Quantity to Manufacture *</Label>
              <Input
                id="quantityToManufacture"
                type="number"
                step="0.01"
                {...register('quantityToManufacture', { valueAsNumber: true })}
                placeholder="1"
                className={errors.quantityToManufacture ? 'border-red-500' : ''}
              />
              {errors.quantityToManufacture && (
                <p className="text-sm text-red-500 mt-1">{errors.quantityToManufacture.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate')}
                className={errors.startDate ? 'border-red-500' : ''}
              />
            </div>

            <div>
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="date" {...register('deadline')} />
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
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="warehouseId">Destination Warehouse</Label>
              <Select
                value={watch('warehouseId')}
                onValueChange={(value) => setValue('warehouseId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Work Order' : 'Create Work Order'}
        </Button>
      </div>
    </form>
  );
}
