'use client';

import { useState, useEffect } from 'react';
import { VendorList } from '@/components/purchasing/VendorList';
import { VendorForm } from '@/components/purchasing/VendorForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  isActive: boolean;
  _count?: {
    purchaseOrders: number;
  };
}

type ViewMode = 'list' | 'create' | 'edit';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const response = await fetch('/api/purchasing/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVendor = async (data: any) => {
    try {
      const response = await fetch('/api/purchasing/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadVendors();
        setViewMode('list');
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
      alert('Failed to create vendor');
    }
  };

  const handleUpdateVendor = async (data: any) => {
    if (!selectedVendor) return;

    try {
      const response = await fetch(`/api/purchasing/vendors/${selectedVendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadVendors();
        setViewMode('list');
        setSelectedVendor(null);
      }
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert('Failed to update vendor');
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    try {
      const response = await fetch(`/api/purchasing/vendors/${vendorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadVendors();
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Failed to delete vendor');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading vendors...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {viewMode === 'list' ? (
        <VendorList
          vendors={vendors}
          onCreateNew={() => setViewMode('create')}
          onEdit={(vendor) => {
            setSelectedVendor(vendor);
            setViewMode('edit');
          }}
          onDelete={handleDeleteVendor}
          onView={(vendor) => {
            setSelectedVendor(vendor);
            setViewMode('edit');
          }}
        />
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Vendors
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-6">
            {viewMode === 'create' ? 'Add New Vendor' : 'Edit Vendor'}
          </h1>
          <VendorForm
            initialData={selectedVendor || undefined}
            onSubmit={viewMode === 'create' ? handleCreateVendor : handleUpdateVendor}
            onCancel={() => setViewMode('list')}
          />
        </div>
      )}
    </div>
  );
}
