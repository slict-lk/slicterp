'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Warehouse, MapPin } from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  _count?: {
    stockLocations: number;
  };
}

interface WarehouseListProps {
  warehouses: Warehouse[];
  onCreateNew: () => void;
  onEdit: (warehouse: Warehouse) => void;
  onDelete: (warehouseId: string) => void;
  onView: (warehouse: Warehouse) => void;
}

export function WarehouseList({
  warehouses,
  onCreateNew,
  onEdit,
  onDelete,
  onView,
}: WarehouseListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredWarehouses = warehouses.filter((warehouse) => {
    const matchesSearch =
      warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.city?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && warehouse.isActive) ||
      (filterStatus === 'INACTIVE' && !warehouse.isActive);

    return matchesSearch && matchesStatus;
  });

  const activeCount = warehouses.filter((w) => w.isActive).length;
  const inactiveCount = warehouses.filter((w) => !w.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Warehouses</h2>
          <p className="text-gray-600">
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Warehouse
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
                  placeholder="Search warehouses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'ALL' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('ALL')}
              >
                All ({warehouses.length})
              </Button>
              <Button
                variant={filterStatus === 'ACTIVE' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('ACTIVE')}
              >
                Active ({activeCount})
              </Button>
              <Button
                variant={filterStatus === 'INACTIVE' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('INACTIVE')}
              >
                Inactive ({inactiveCount})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warehouse Grid */}
      {filteredWarehouses.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Warehouse className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No warehouses found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'ALL'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first warehouse'}
              </p>
              {!searchTerm && filterStatus === 'ALL' && (
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Warehouse
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarehouses.map((warehouse) => (
            <Card
              key={warehouse.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onView(warehouse)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Warehouse className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                      <span className="text-xs text-gray-500">{warehouse.code}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      warehouse.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {warehouse.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {warehouse._count && (
                    <span className="text-xs text-gray-500">
                      {warehouse._count.stockLocations} locations
                    </span>
                  )}
                </div>

                {(warehouse.city || warehouse.state || warehouse.country) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-600">
                      {[warehouse.city, warehouse.state, warehouse.country]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  </div>
                )}

                {warehouse.address && (
                  <p className="text-sm text-gray-600 line-clamp-2">{warehouse.address}</p>
                )}

                {warehouse.phone && (
                  <p className="text-xs text-gray-500">Phone: {warehouse.phone}</p>
                )}

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(warehouse);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete warehouse ${warehouse.name}?`)) onDelete(warehouse.id);
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
