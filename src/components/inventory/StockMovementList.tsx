'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, RefreshCw, ArrowRightLeft } from 'lucide-react';

interface StockMovement {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  warehouseId: string;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
  toWarehouseId?: string;
  toWarehouse?: {
    id: string;
    name: string;
    code: string;
  };
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  reference?: string;
  reason?: string;
  movementDate: Date;
  createdAt: Date;
}

interface StockMovementListProps {
  movements: StockMovement[];
  onCreateNew: () => void;
  onView: (movement: StockMovement) => void;
}

const TYPE_CONFIG = {
  IN: {
    label: 'Stock In',
    icon: ArrowDownCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  OUT: {
    label: 'Stock Out',
    icon: ArrowUpCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    icon: RefreshCw,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  TRANSFER: {
    label: 'Transfer',
    icon: ArrowRightLeft,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
};

export function StockMovementList({
  movements,
  onCreateNew,
  onView,
}: StockMovementListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch =
      movement.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.product?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.warehouse?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reference?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || movement.type === filterType;

    return matchesSearch && matchesType;
  });

  const totalIn = movements.filter((m) => m.type === 'IN').reduce((sum, m) => sum + m.quantity, 0);
  const totalOut = movements.filter((m) => m.type === 'OUT').reduce((sum, m) => sum + m.quantity, 0);
  const totalTransfers = movements.filter((m) => m.type === 'TRANSFER').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stock Movements</h2>
          <p className="text-gray-600">{filteredMovements.length} transactions</p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Record Movement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Stock In</p>
                <p className="text-2xl font-bold text-green-600">{totalIn.toFixed(2)}</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Stock Out</p>
                <p className="text-2xl font-bold text-red-600">{totalOut.toFixed(2)}</p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Transfers</p>
                <p className="text-2xl font-bold text-purple-600">{totalTransfers}</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search movements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === 'ALL' ? 'default' : 'outline'}
                onClick={() => setFilterType('ALL')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterType === 'IN' ? 'default' : 'outline'}
                onClick={() => setFilterType('IN')}
                size="sm"
              >
                Stock In
              </Button>
              <Button
                variant={filterType === 'OUT' ? 'default' : 'outline'}
                onClick={() => setFilterType('OUT')}
                size="sm"
              >
                Stock Out
              </Button>
              <Button
                variant={filterType === 'ADJUSTMENT' ? 'default' : 'outline'}
                onClick={() => setFilterType('ADJUSTMENT')}
                size="sm"
              >
                Adjustments
              </Button>
              <Button
                variant={filterType === 'TRANSFER' ? 'default' : 'outline'}
                onClick={() => setFilterType('TRANSFER')}
                size="sm"
              >
                Transfers
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movement List */}
      {filteredMovements.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No stock movements found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterType !== 'ALL'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by recording your first stock movement'}
              </p>
              {!searchTerm && filterType === 'ALL' && (
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Movement
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Warehouse
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMovements.map((movement) => {
                    const config = TYPE_CONFIG[movement.type];
                    const Icon = config.icon;

                    return (
                      <tr
                        key={movement.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => onView(movement)}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {new Date(movement.movementDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(movement.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg ${config.bgColor} mr-2`}>
                              <Icon className={`h-4 w-4 ${config.color}`} />
                            </div>
                            <span className={`text-sm font-medium ${config.color}`}>
                              {config.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {movement.product?.name}
                          </div>
                          <div className="text-xs text-gray-500">{movement.product?.sku}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {movement.warehouse?.name}
                          </div>
                          {movement.type === 'TRANSFER' && movement.toWarehouse && (
                            <div className="text-xs text-gray-500">
                              → {movement.toWarehouse.name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`text-sm font-bold ${config.color}`}>
                            {movement.type === 'OUT' ? '-' : '+'}
                            {movement.quantity.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{movement.reference || '-'}</div>
                          {movement.reason && (
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {movement.reason}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
