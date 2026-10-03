'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useManufacturing } from '@/hooks/useManufacturing';
import { Package } from 'lucide-react';

export function BOMList() {
  const { boms, loading, error } = useManufacturing();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading BOMs...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bills of Materials</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {boms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No BOMs found</p>
              <Button variant="outline" className="mt-4">
                Create First BOM
              </Button>
            </div>
          ) : (
            boms.map((bom) => (
              <div
                key={bom.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <div>
                  <p className="font-medium">{bom.code}</p>
                  <p className="text-sm text-gray-600">
                    Product: {bom.productId} | Qty: {bom.quantity}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {bom.components?.length || 0} components
                </div>
              </div>
            ))
          )}
        </div>
        {boms.length > 0 && (
          <Button variant="outline" className="w-full mt-4">
            View All BOMs
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
