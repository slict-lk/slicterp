'use client';

import { useState, useEffect } from 'react';
import { CategoryList } from '@/components/inventory/CategoryList';
import { CategoryForm } from '@/components/inventory/CategoryForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  _count: {
    products: number;
    children: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryFormData {
  name: string;
  description?: string;
  parentId?: string;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (viewMode === 'list') {
      fetchCategories();
    }
  }, [viewMode]);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/inventory/categories?includeChildren=true');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Build hierarchical structure and ensure proper _count
          const categoryMap = new Map();
          const rootCategories: Category[] = [];

          // First pass: create map and identify roots
          result.data.forEach((category: any) => {
            categoryMap.set(category.id, {
              ...category,
              _count: {
                products: category._count?.products || 0,
                children: category.children?.length || 0,
              },
              children: [],
            });
            if (!category.parentId) {
              rootCategories.push(categoryMap.get(category.id));
            }
          });

          // Second pass: build hierarchy
          result.data.forEach((category: any) => {
            if (category.parentId) {
              const parent = categoryMap.get(category.parentId);
              if (parent) {
                parent.children.push(categoryMap.get(category.id));
                parent._count.children = parent.children.length;
              }
            }
          });

          setCategories(rootCategories);
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedCategory(null);
    setViewMode('create');
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setViewMode('edit');
  };

  const handleDelete = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/inventory/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCategories();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category');
    }
  };

  const handleFormSubmit = async (data: CategoryFormData) => {
    setIsSubmitting(true);

    try {
      const method = selectedCategory ? 'PUT' : 'POST';
      const url = selectedCategory
        ? `/api/inventory/categories/${selectedCategory.id}`
        : '/api/inventory/categories';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setViewMode('list');
        setSelectedCategory(null);
        await fetchCategories();
      } else {
        alert(result.error || 'Failed to save category');
      }
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedCategory(null);
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setViewMode('list')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Categories
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              {viewMode === 'create' ? 'Create New Category' : 'Edit Category'}
            </h1>
            <p className="text-gray-600 mt-2">
              {viewMode === 'create'
                ? 'Add a new product category to organize your inventory'
                : 'Update category information and hierarchy'
              }
            </p>
          </div>

          <CategoryForm
            initialData={selectedCategory ? {
              id: selectedCategory.id,
              name: selectedCategory.name,
              description: selectedCategory.description,
              parentId: selectedCategory.parentId,
            } : undefined}
            categories={categories}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <CategoryList
        categories={categories}
        onCreateNew={handleCreateNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
    </div>
  );
}
