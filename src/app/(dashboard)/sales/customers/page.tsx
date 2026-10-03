'use client';

import { useState, useEffect } from 'react';
import { CustomerList } from '@/components/sales/CustomerList';
import { CustomerForm } from '@/components/sales/CustomerForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'INDIVIDUAL' | 'COMPANY';
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  taxId?: string;
  website?: string;
  createdAt: Date;
}

type ViewMode = 'list' | 'create' | 'edit' | 'view';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/sales/customers');
      if (response.ok) {
        const responseData = await response.json();
        setCustomers(responseData.data || []);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomer = async (data: any) => {
    try {
      const response = await fetch('/api/sales/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadCustomers();
        setViewMode('list');
      } else {
        throw new Error('Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer. Please try again.');
    }
  };

  const handleUpdateCustomer = async (data: any) => {
    if (!selectedCustomer) return;

    try {
      const response = await fetch(`/api/sales/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadCustomers();
        setViewMode('list');
        setSelectedCustomer(null);
      } else {
        throw new Error('Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer. Please try again.');
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const response = await fetch(`/api/sales/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadCustomers();
      } else {
        throw new Error('Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading customers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {viewMode === 'list' ? (
        <CustomerList
          customers={customers}
          onCreateNew={() => setViewMode('create')}
          onEdit={(customer) => {
            setSelectedCustomer(customer);
            setViewMode('edit');
          }}
          onDelete={handleDeleteCustomer}
          onView={(customer) => {
            setSelectedCustomer(customer);
            setViewMode('view');
          }}
        />
      ) : viewMode === 'create' ? (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-6">Create New Customer</h1>
          <CustomerForm
            onSubmit={handleCreateCustomer}
            onCancel={() => setViewMode('list')}
          />
        </div>
      ) : viewMode === 'edit' && selectedCustomer ? (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-6">Edit Customer</h1>
          <CustomerForm
            initialData={selectedCustomer}
            onSubmit={handleUpdateCustomer}
            onCancel={() => setViewMode('list')}
          />
        </div>
      ) : viewMode === 'view' && selectedCustomer ? (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <Button variant="outline" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
            <Button onClick={() => setViewMode('edit')}>Edit Customer</Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <h1 className="text-3xl font-bold mb-6">{selectedCustomer.name}</h1>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-medium">{selectedCustomer.type}</p>
                </div>
                {selectedCustomer.email && (
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedCustomer.email}</p>
                  </div>
                )}
                {selectedCustomer.phone && (
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{selectedCustomer.phone}</p>
                  </div>
                )}
                {selectedCustomer.city && (
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="font-medium">{selectedCustomer.city}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
