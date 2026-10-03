'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WorkOrderList } from '@/components/manufacturing/WorkOrderList';
import { WorkOrderForm } from '@/components/manufacturing/WorkOrderForm';
import { ArrowLeft } from 'lucide-react';

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  quantityToManufacture: number;
  quantityProduced: number;
  startDate: Date;
  deadline?: Date;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  createdAt: Date;
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [boms, setBOMs] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  useEffect(() => {
    fetchWorkOrders();
    fetchProducts();
    fetchBOMs();
    fetchWarehouses();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const response = await fetch('/api/manufacturing/orders');
      if (response.ok) {
        const data = await response.json();
        setWorkOrders(data.map((wo: any) => ({
          ...wo,
          startDate: new Date(wo.startDate),
          deadline: wo.deadline ? new Date(wo.deadline) : undefined,
          createdAt: new Date(wo.createdAt),
        })));
      }
    } catch (error) {
      console.error('Failed to fetch work orders:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/inventory/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchBOMs = async () => {
    try {
      const response = await fetch('/api/manufacturing/bom');
      if (response.ok) {
        const data = await response.json();
        setBOMs(data);
      }
    } catch (error) {
      console.error('Failed to fetch BOMs:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/inventory/warehouses');
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  const handleCreateWO = async (data: any) => {
    try {
      const response = await fetch('/api/manufacturing/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        await fetchWorkOrders();
        setViewMode('list');
      } else {
        throw new Error('Failed to create work order');
      }
    } catch (error) {
      console.error('Error creating work order:', error);
      alert('Failed to create work order. Please try again.');
    }
  };

  const handleUpdateWO = async (data: any) => {
    if (!selectedWO) return;
    try {
      const response = await fetch(`/api/manufacturing/orders/${selectedWO.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        await fetchWorkOrders();
        setViewMode('list');
      } else {
        throw new Error('Failed to update work order');
      }
    } catch (error) {
      console.error('Error updating work order:', error);
      alert('Failed to update work order. Please try again.');
    }
  };

  const handleEdit = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setViewMode('edit');
  };

  const handleDelete = async (woId: string) => {
    if (!confirm('Are you sure you want to delete this work order?')) return;
    try {
      const response = await fetch(`/api/manufacturing/orders/${woId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchWorkOrders();
      } else {
        throw new Error('Failed to delete work order');
      }
    } catch (error) {
      console.error('Error deleting work order:', error);
      alert('Failed to delete work order. Please try again.');
    }
  };

  const handleView = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setViewMode('edit');
  };

  return (
    <div className="space-y-6 p-6">
      {viewMode === 'list' ? (
        <WorkOrderList
          workOrders={workOrders}
          onCreateNew={() => setViewMode('create')}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
      ) : (
        <div>
          <Button variant="ghost" onClick={() => setViewMode('list')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
          <h1 className="text-3xl font-bold mb-6">
            {viewMode === 'create' ? 'Create Work Order' : 'Edit Work Order'}
          </h1>
          <WorkOrderForm
            initialData={
              selectedWO
                ? {
                  ...selectedWO,
                  startDate: selectedWO.startDate.toISOString().split('T')[0],
                  deadline: selectedWO.deadline
                    ? selectedWO.deadline.toISOString().split('T')[0]
                    : undefined,
                }
                : undefined
            }
            products={products}
            boms={boms}
            warehouses={warehouses}
            onSubmit={viewMode === 'create' ? handleCreateWO : handleUpdateWO}
            onCancel={() => setViewMode('list')}
          />
        </div>
      )}
    </div>
  );
}
