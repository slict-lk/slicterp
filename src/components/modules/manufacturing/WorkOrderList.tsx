'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useManufacturing } from '@/hooks/useManufacturing';
import { Factory } from 'lucide-react';

export function WorkOrderList() {
  const { orders, loading, error } = useManufacturing();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading work orders...</div>
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      CONFIRMED: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
      DONE: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Factory className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No work orders found</p>
              <Button variant="outline" className="mt-4">
                Create First Work Order
              </Button>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{order.reference}</p>
                  <p className="text-sm text-gray-600">
                    Product: {order.productId} × {order.quantity}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
            ))
          )}
        </div>
        {orders.length > 0 && (
          <Button variant="outline" className="w-full mt-4">
            View All Work Orders
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
