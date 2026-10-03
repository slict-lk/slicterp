'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Package, DollarSign, Archive } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  type: 'STORABLE' | 'CONSUMABLE' | 'SERVICE';
  listPrice: number;
  costPrice?: number;
  qtyAvailable: number;
  barcode?: string;
  isActive: boolean;
  createdAt: Date;
}

interface ProductListProps {
  products: Product[];
  onCreateNew: () => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onView: (product: Product) => void;
}

const TYPE_COLORS = {
  STORABLE: 'bg-blue-100 text-blue-800',
  CONSUMABLE: 'bg-green-100 text-green-800',
  SERVICE: 'bg-purple-100 text-purple-800',
};

export function ProductList({
  products,
  onCreateNew,
  onEdit,
  onDelete,
  onView,
}: ProductListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || product.type === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <p className="text-gray-600">{filteredProducts.length} products</p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'ALL' ? 'default' : 'outline'}
                onClick={() => setFilterType('ALL')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'STORABLE' ? 'default' : 'outline'}
                onClick={() => setFilterType('STORABLE')}
              >
                Storable
              </Button>
              <Button
                variant={filterType === 'CONSUMABLE' ? 'default' : 'outline'}
                onClick={() => setFilterType('CONSUMABLE')}
              >
                Consumable
              </Button>
              <Button
                variant={filterType === 'SERVICE' ? 'default' : 'outline'}
                onClick={() => setFilterType('SERVICE')}
              >
                Service
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterType !== 'ALL'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first product'}
              </p>
              {!searchTerm && filterType === 'ALL' && (
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Product
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onView(product)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {product.type === 'SERVICE' ? (
                        <Archive className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Package className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <span className="text-xs text-gray-500">{product.sku}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded ${TYPE_COLORS[product.type]}`}>
                    {product.type}
                  </span>
                  {!product.isActive && (
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                      Inactive
                    </span>
                  )}
                </div>

                {product.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    <span className="text-lg font-bold">${Number(product.listPrice || 0).toFixed(2)}</span>
                  </div>
                  {product.type !== 'SERVICE' && (
                    <div className="text-sm text-gray-600">
                      Stock: <span className="font-medium">{product.qtyAvailable}</span>
                    </div>
                  )}
                </div>

                {product.costPrice != null && (
                  <div className="text-xs text-gray-500">
                    Cost: ${Number(product.costPrice).toFixed(2)} • Margin:{' '}
                    {(((Number(product.listPrice || 0) - Number(product.costPrice)) / Number(product.listPrice || 1)) * 100).toFixed(
                      1
                    )}
                    %
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(product);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this product?')) onDelete(product.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
