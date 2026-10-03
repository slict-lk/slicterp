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
import { Save, X } from 'lucide-react';

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  type: z.enum(['STORABLE', 'CONSUMABLE', 'SERVICE']),
  categoryId: z.string().optional(),
  listPrice: z.number().min(0, 'Price must be non-negative'),
  costPrice: z.number().min(0).optional(),
  qtyAvailable: z.number().min(0).optional(),
  barcode: z.string().optional(),
  weight: z.number().min(0).optional(),
  volume: z.number().min(0).optional(),
  canBeSold: z.boolean().optional(),
  canBePurchased: z.boolean().optional(),
  aliases: z.array(z.object({
    aliasNumber: z.string().min(1, 'Alias number is required'),
    brand: z.string().optional()
  })).optional()
});

type ProductFormData = z.infer<typeof productSchema>;

interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  children?: Category[];
  _count: {
    products: number;
    children: number;
  };
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData> & { id?: string };
  categories?: Category[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ initialData, categories = [], onSubmit, onCancel }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control // Add control
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: initialData?.sku || '',
      name: initialData?.name || '',
      description: initialData?.description || '',
      type: initialData?.type || 'STORABLE',
      categoryId: initialData?.categoryId || undefined,
      listPrice: initialData?.listPrice || 0,
      costPrice: initialData?.costPrice || 0,
      qtyAvailable: initialData?.qtyAvailable || 0,
      barcode: initialData?.barcode || '',
      weight: initialData?.weight || 0,
      volume: initialData?.volume || 0,
      canBeSold: initialData?.canBeSold ?? true,
      canBePurchased: initialData?.canBePurchased ?? true,
      aliases: (initialData as any)?.aliases || [] // Initialize aliases
    },
  });

  // Use Field Array for Aliases
  const { fields, append, remove } = useFieldArray({
    control,
    name: "aliases",
  });

  const productType = watch('type');

  // ... buildCategoryOptions function and onSubmit ...

  const buildCategoryOptions = (categories: Category[], level = 0): Array<{ value: string; label: string; level: number }> => {
    // ... existing logic
    const options: Array<{ value: string; label: string; level: number }> = [];

    categories.forEach(category => {
      options.push({
        value: category.id,
        label: `${'  '.repeat(level)}${category.name}`,
        level,
      });

      if (category.children && category.children.length > 0) {
        options.push(...buildCategoryOptions(category.children, level + 1));
      }
    });

    return options;
  };

  const onFormSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ... SKU, Name, Description fields ... */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku">SKU / Product Code *</Label>
              <Input
                id="sku"
                {...register('sku')}
                placeholder="PROD-001"
                className={errors.sku ? 'border-red-500' : ''}
              />
              {errors.sku && (
                <p className="text-sm text-red-500 mt-1">{errors.sku.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter product name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Product description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="type">Product Type *</Label>
              <Select
                value={productType}
                onValueChange={(value) => setValue('type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STORABLE">Storable Product</SelectItem>
                  <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="categoryId">Category</Label>
              <Select
                value={watch('categoryId') || 'none'}
                onValueChange={(value) => setValue('categoryId', value === 'none' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {buildCategoryOptions(categories.filter(cat => !cat.parentId)).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span style={{ paddingLeft: `${option.level * 16}px` }}>
                        {option.level > 0 && '└─ '}{option.label.trim()}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                Choose a category to organize your products
              </p>
            </div>

            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                {...register('barcode')}
                placeholder="1234567890"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replacement Part Numbers / Aliases */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Replacement Part Numbers / Aliases</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ aliasNumber: '', brand: '' })}
          >
            + Add Another Alias
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>Alias Number</Label>
                <Input
                  {...register(`aliases.${index}.aliasNumber` as const)}
                  placeholder="e.g. C-1109"
                  className={errors.aliases?.[index]?.aliasNumber ? 'border-red-500' : ''}
                />
                {errors.aliases?.[index]?.aliasNumber && (
                  <p className="text-sm text-red-500 mt-1">{errors.aliases[index]?.aliasNumber?.message}</p>
                )}
              </div>
              <div className="flex-1">
                <Label>Brand (Optional)</Label>
                <Input
                  {...register(`aliases.${index}.brand` as const)}
                  placeholder="e.g. VIC"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => remove(index)}
                aria-label="Remove alias"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-gray-500 italic">No aliases added. Click "Add Another Alias" to add one.</p>
          )}
        </CardContent>
      </Card>


      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="listPrice">Sales Price *</Label>
              <Input
                id="listPrice"
                type="number"
                step="0.01"
                {...register('listPrice', { valueAsNumber: true })}
                placeholder="0.00"
                className={errors.listPrice ? 'border-red-500' : ''}
              />
              {errors.listPrice && (
                <p className="text-sm text-red-500 mt-1">{errors.listPrice.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="costPrice">Cost Price</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                {...register('costPrice', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ... Inventory and Form Actions ... */}
      {/* Inventory */}
      {productType !== 'SERVICE' && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="qtyAvailable">Quantity Available</Label>
                <Input
                  id="qtyAvailable"
                  type="number"
                  step="0.01"
                  {...register('qtyAvailable', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  {...register('weight', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="volume">Volume (m³)</Label>
                <Input
                  id="volume"
                  type="number"
                  step="0.001"
                  {...register('volume', { valueAsNumber: true })}
                  placeholder="0.000"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales & Purchase */}
      <Card>
        <CardHeader>
          <CardTitle>Sales & Purchase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('canBeSold')}
                className="w-4 h-4"
              />
              <span className="text-sm">Can be Sold</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('canBePurchased')}
                className="w-4 h-4"
              />
              <span className="text-sm">Can be Purchased</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
