'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';

interface BOM {
  id: string;
  bomNumber: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  name: string;
  type: 'MANUFACTURING' | 'KIT';
  quantity: number;
  isActive: boolean;
  _count?: {
    lines: number;
  };
}

interface BOMListProps {
  boms: BOM[];
  onCreateNew: () => void;
  onEdit: (bom: BOM) => void;
  onDelete: (bomId: string) => void;
  onView: (bom: BOM) => void;
}

export function BillOfMaterialsList({
  boms,
  onCreateNew,
  onEdit,
  onDelete,
  onView,
}: BOMListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredBOMs = boms.filter((bom) => {
    const matchesSearch =
      bom.bomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.product?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || bom.type === filterType;

    return matchesSearch && matchesType;
  });

  const activeCount = boms.filter((b) => b.isActive).length;
  const inactiveCount = boms.filter((b) => !b.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bill of Materials</h2>
          <p className="text-gray-600">
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New BOM
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
                  placeholder="Search BOMs..."
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
                All ({boms.length})
              </Button>
              <Button
                variant={filterType === 'MANUFACTURING' ? 'default' : 'outline'}
                onClick={() => setFilterType('MANUFACTURING')}
              >
                Manufacturing
              </Button>
              <Button
                variant={filterType === 'KIT' ? 'default' : 'outline'}
                onClick={() => setFilterType('KIT')}
              >
                Kit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOM Grid */}
      {filteredBOMs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No BOMs found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterType !== 'ALL'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first Bill of Materials'}
              </p>
              {!searchTerm && filterType === 'ALL' && (
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create BOM
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBOMs.map((bom) => (
            <Card
              key={bom.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onView(bom)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Package className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{bom.name}</CardTitle>
                      <span className="text-xs text-gray-500">{bom.bomNumber}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      bom.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {bom.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      bom.type === 'MANUFACTURING'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {bom.type}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  <span className="font-medium">Product:</span> {bom.product?.name}
                </div>

                <div className="text-sm text-gray-600">
                  <span className="font-medium">Quantity:</span> {bom.quantity}
                </div>

                {bom._count && (
                  <div className="text-xs text-gray-500">
                    {bom._count.lines} component{bom._count.lines !== 1 ? 's' : ''}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(bom);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete BOM ${bom.name}?`)) onDelete(bom.id);
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
