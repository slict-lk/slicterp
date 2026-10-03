'use client';

import { useState, useEffect } from 'react';
import { PurchaseOrderList } from '@/components/purchasing/PurchaseOrderList';
import { PurchaseOrderForm } from '@/components/purchasing/PurchaseOrderForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  vendorId: string;
  vendor?: {
    id: string;
    name: string;
  };
  orderDate: Date;
  expectedDate?: Date;
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';
  total: number;
  notes?: string;
  lines: any[];
  createdAt: Date;
}

interface Vendor {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  listPrice: number;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPurchaseOrders();
    loadVendors();
    loadProducts();
  }, []);

  const loadPurchaseOrders = async () => {
    try {
      const response = await fetch('/api/purchasing/orders');
      if (response.ok) {
        const responseData = await response.json();
        setPurchaseOrders(responseData.data || []);
      }
    } catch (error) {
      console.error('Failed to load purchase orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const response = await fetch('/api/purchasing/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/inventory/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleCreatePO = async (data: any) => {
    try {
      const response = await fetch('/api/purchasing/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadPurchaseOrders();
        setViewMode('list');
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert('Failed to create purchase order');
    }
  };

  const handleUpdatePO = async (data: any) => {
    if (!selectedPO) return;

    try {
      const response = await fetch(`/api/purchasing/orders/${selectedPO.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadPurchaseOrders();
        setViewMode('list');
        setSelectedPO(null);
      }
    } catch (error) {
      console.error('Error updating purchase order:', error);
      alert('Failed to update purchase order');
    }
  };

  const handleDeletePO = async (poId: string) => {
    try {
      const response = await fetch(`/api/purchasing/orders/${poId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadPurchaseOrders();
      }
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      alert('Failed to delete purchase order');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading purchase orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {viewMode === 'list' ? (
        <PurchaseOrderList
          purchaseOrders={purchaseOrders}
          onCreateNew={() => setViewMode('create')}
          onEdit={(po) => {
            setSelectedPO(po);
            setViewMode('edit');
          }}
          onDelete={handleDeletePO}
          onView={(po) => {
            setSelectedPO(po);
            setViewMode('edit');
          }}
        />
      ) : (
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Purchase Orders
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-6">
            {viewMode === 'create' ? 'Create Purchase Order' : 'Edit Purchase Order'}
          </h1>
          <PurchaseOrderForm
            initialData={selectedPO ? {
              ...selectedPO,
              orderDate: selectedPO.orderDate.toISOString().split('T')[0],
              expectedDate: selectedPO.expectedDate
                ? selectedPO.expectedDate.toISOString().split('T')[0]
                : undefined
            } : undefined}
            vendors={vendors}
            products={products}
            onSubmit={viewMode === 'create' ? handleCreatePO : handleUpdatePO}
            onCancel={() => setViewMode('list')}
          />
        </div>
      )}
    </div>
  );
}
