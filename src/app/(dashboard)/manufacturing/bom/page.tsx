'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BillOfMaterialsList } from '@/components/manufacturing/BillOfMaterialsList';
import { ArrowLeft } from 'lucide-react';

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

export default function BOMPage() {
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);

  useEffect(() => {
    fetchBOMs();
  }, []);

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

  const handleCreateNew = () => {
    setSelectedBOM(null);
    setViewMode('create');
  };

  const handleEdit = (bom: BOM) => {
    setSelectedBOM(bom);
    setViewMode('edit');
  };

  const handleDelete = async (bomId: string) => {
    if (!confirm('Are you sure you want to delete this BOM?')) return;
    try {
      const response = await fetch(`/api/manufacturing/bom/${bomId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchBOMs();
      } else {
        throw new Error('Failed to delete BOM');
      }
    } catch (error) {
      console.error('Error deleting BOM:', error);
      alert('Failed to delete BOM. Please try again.');
    }
  };

  const handleView = (bom: BOM) => {
    setSelectedBOM(bom);
    setViewMode('edit');
  };

  return (
    <div className="space-y-6 p-6">
      {viewMode === 'list' ? (
        <BillOfMaterialsList
          boms={boms}
          onCreateNew={handleCreateNew}
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
            {viewMode === 'create' ? 'Create Bill of Materials' : 'Edit Bill of Materials'}
          </h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              BOM Form component integration pending. This would include:
              <ul className="list-disc ml-6 mt-2">
                <li>Product selection</li>
                <li>BOM type (Manufacturing/Kit)</li>
                <li>Component lines with quantities</li>
                <li>Scrap factor calculations</li>
              </ul>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
