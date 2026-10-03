import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

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

interface CategoryFormProps {
  initialData?: Partial<CategoryFormData & { id?: string }>;
  categories?: Category[];
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CategoryForm({
  initialData,
  categories = [],
  onSubmit,
  onCancel,
  isLoading
}: CategoryFormProps) {
  const [availableParents, setAvailableParents] = useState<Category[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      parentId: initialData?.parentId ?? undefined,
    },
  });

  const selectedParentId = watch('parentId');

  useEffect(() => {
    // Filter out the current category and its children from available parents
    // to prevent circular references
    let filteredCategories = categories;

    if (initialData?.id) {
      // Remove current category and its descendants
      const removeCategoryAndChildren = (categoryId: string): string[] => {
        const toRemove = [categoryId];
        const category = categories.find(c => c.id === categoryId);
        if (category?.children) {
          category.children.forEach(child => {
            toRemove.push(...removeCategoryAndChildren(child.id));
          });
        }
        return toRemove;
      };

      const idsToRemove = removeCategoryAndChildren(initialData.id);
      filteredCategories = categories.filter(cat => !idsToRemove.includes(cat.id));
    }

    setAvailableParents(filteredCategories);
  }, [categories, initialData?.id]);

  const onFormSubmit = async (data: CategoryFormData) => {
    try {
      await onSubmit({
        ...data,
        parentId: data.parentId || undefined,
      });
      reset();
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const buildCategoryOptions = (categories: Category[], level = 0): Array<{ value: string; label: string; level: number }> => {
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

  const categoryOptions = buildCategoryOptions(
    availableParents.filter(cat => !cat.parentId)
  );

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{initialData?.id ? 'Edit Category' : 'Create New Category'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter category name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Parent Category */}
          <div className="space-y-2">
            <Label htmlFor="parentId">Parent Category (Optional)</Label>
            <Select
              value={selectedParentId || 'none'}
              onValueChange={(value) => setValue('parentId', value === 'none' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent category (leave empty for root category)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Parent (Root Category)</SelectItem>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span style={{ paddingLeft: `${option.level * 16}px` }}>
                      {option.level > 0 && '└─ '}{option.label.trim()}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Choose a parent category to create a subcategory hierarchy
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe this category..."
              rows={3}
            />
            <p className="text-sm text-gray-500">
              Optional description to help identify this category's purpose
            </p>
          </div>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Name:</span>
                  <span className="font-medium">
                    {watch('name') || 'Category Name'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Parent:</span>
                  <span className="font-medium">
                    {selectedParentId
                      ? availableParents.find(c => c.id === selectedParentId)?.name || 'Unknown'
                      : 'Root Category'
                    }
                  </span>
                </div>
                {watch('description') && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-gray-500">Description:</span>
                    <span className="text-sm">{watch('description')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (initialData?.id ? 'Update Category' : 'Create Category')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
