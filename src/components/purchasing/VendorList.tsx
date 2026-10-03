'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Building2, Mail, Phone, Globe } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
  contactPerson?: string;
  paymentTerms?: string;
  creditLimit?: number;
  isActive: boolean;
  _count?: {
    purchaseOrders: number;
  };
}

interface VendorListProps {
  vendors: Vendor[];
  onCreateNew: () => void;
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendorId: string) => void;
  onView: (vendor: Vendor) => void;
}

export function VendorList({
  vendors,
  onCreateNew,
  onEdit,
  onDelete,
  onView,
}: VendorListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && vendor.isActive) ||
      (filterStatus === 'INACTIVE' && !vendor.isActive);

    return matchesSearch && matchesStatus;
  });

  const activeCount = vendors.filter((v) => v.isActive).length;
  const inactiveCount = vendors.filter((v) => !v.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vendors</h2>
          <p className="text-gray-600">
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Vendor
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
                  placeholder="Search vendors..."
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
                All ({vendors.length})
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

      {/* Vendor Grid */}
      {filteredVendors.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'ALL'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first vendor'}
              </p>
              {!searchTerm && filterStatus === 'ALL' && (
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vendor
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <Card
              key={vendor.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onView(vendor)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{vendor.name}</CardTitle>
                      {vendor.contactPerson && (
                        <span className="text-xs text-gray-500">{vendor.contactPerson}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      vendor.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {vendor.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {vendor._count && vendor._count.purchaseOrders > 0 && (
                    <span className="text-xs text-gray-500">
                      {vendor._count.purchaseOrders} PO{vendor._count.purchaseOrders !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {(vendor.city || vendor.state || vendor.country) && (
                  <div className="text-sm text-gray-600">
                    {[vendor.city, vendor.state, vendor.country].filter(Boolean).join(', ')}
                  </div>
                )}

                <div className="space-y-1">
                  {vendor.email && (
                    <div className="flex items-center text-xs text-gray-600">
                      <Mail className="h-3 w-3 mr-1" />
                      {vendor.email}
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center text-xs text-gray-600">
                      <Phone className="h-3 w-3 mr-1" />
                      {vendor.phone}
                    </div>
                  )}
                  {vendor.website && (
                    <div className="flex items-center text-xs text-gray-600">
                      <Globe className="h-3 w-3 mr-1" />
                      {vendor.website}
                    </div>
                  )}
                </div>

                {vendor.paymentTerms && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    Terms: {vendor.paymentTerms}
                  </div>
                )}

                {vendor.creditLimit && vendor.creditLimit > 0 && (
                  <div className="text-xs text-gray-500">
                    Credit Limit: ${vendor.creditLimit.toFixed(2)}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(vendor);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete vendor ${vendor.name}?`)) onDelete(vendor.id);
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
