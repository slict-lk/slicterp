import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Folder,
  FolderOpen,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Package,
} from 'lucide-react';

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

interface CategoryListProps {
  categories: Category[];
  onCreateNew: () => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  isLoading?: boolean;
}

export function CategoryList({
  categories,
  onCreateNew,
  onEdit,
  onDelete,
  isLoading,
}: CategoryListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const CategoryItem = ({
    category,
    level = 0,
    isLast = false
  }: {
    category: Category;
    level?: number;
    isLast?: boolean;
  }) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const indentClass = level > 0 ? `ml-${level * 4}` : '';

    return (
      <div>
        <div className={`
          flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors
          ${indentClass}
        `}>
          <div className="flex items-center gap-3 flex-1">
            {hasChildren ? (
              <button
                onClick={() => toggleExpanded(category.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-6" /> // Spacer for alignment
            )}

            <div className="flex items-center gap-2">
              {isExpanded ? (
                <FolderOpen className="h-5 w-5 text-blue-500" />
              ) : (
                <Folder className="h-5 w-5 text-blue-500" />
              )}
              <div>
                <span className="font-medium text-gray-900">{category.name}</span>
                {category.description && (
                  <p className="text-sm text-gray-500">{category.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {category._count.products} products
            </Badge>

            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(category)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
                    onDelete(category.id);
                  }
                }}
                disabled={category._count.products > 0}
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </div>
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {category.children!.map((child, index) => (
              <CategoryItem
                key={child.id}
                category={child}
                level={level + 1}
                isLast={index === category.children!.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Separate root categories from all categories
  const rootCategories = categories.filter(cat => !cat.parentId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Categories</h2>
          <p className="text-gray-600">Organize your products into hierarchical categories</p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Folder className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {categories.length}
              </p>
              <p className="text-sm text-gray-600">Total Categories</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FolderOpen className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {rootCategories.length}
              </p>
              <p className="text-sm text-gray-600">Root Categories</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {categories.reduce((sum, cat) => sum + cat._count.products, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Products</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <ChevronDown className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {categories.filter(cat => cat.children && cat.children.length > 0).length}
              </p>
              <p className="text-sm text-gray-600">Categories with Subcategories</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories List */}
      {rootCategories.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
              <p className="text-gray-600 mb-4">Create your first product category to organize your inventory</p>
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Category
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rootCategories.map((category) => (
            <CategoryItem key={category.id} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}
