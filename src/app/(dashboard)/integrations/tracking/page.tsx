'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Truck, MapPin, Clock, Package, RefreshCw } from 'lucide-react';

interface Shipment {
  id: string;
  trackingNumber: string;
  courierName: string;
  status: string;
  originAddress: {
    city: string;
    country: string;
  };
  destinationAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  estimatedDelivery?: string;
  actualDelivery?: string;
  lastUpdated: string;
  shippingCost?: number;
  salesOrder?: {
    orderNumber: string;
    customer: {
      name: string;
    };
  };
}

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-800',
  PICKED_UP: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-yellow-100 text-yellow-800',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  RETURNED: 'bg-purple-100 text-purple-800',
};

const COURIER_LOGOS = {
  ARAMEX: '🟣',
  DHL: '🟡',
  DOMEX: '🔵',
};

export default function CourierTrackingPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState('');

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      const response = await fetch('/api/integrations/shipments');
      const result = await response.json();

      if (result.success) {
        setShipments(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackShipment = async (trackingNumber: string) => {
    try {
      const response = await fetch(`/api/integrations/shipments/track?trackingNumber=${trackingNumber}`);
      const result = await response.json();

      if (result.success) {
        // Update the shipment in the list
        setShipments(prev =>
          prev.map(s =>
            s.trackingNumber === trackingNumber ? { ...s, ...result.data.tracking } : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to track shipment:', error);
    }
  };

  const filteredShipments = shipments.filter(shipment =>
    shipment.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.salesOrder?.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.salesOrder?.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTrackSpecific = async () => {
    if (tracking.trim()) {
      await trackShipment(tracking.trim());
      setTracking('');
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.PENDING}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Courier Tracking</h1>
          <p className="text-gray-600">Track shipments and delivery status</p>
        </div>
        <Button onClick={fetchShipments} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by tracking number, order number, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter tracking number"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                className="w-64"
              />
              <Button onClick={handleTrackSpecific}>
                <Truck className="h-4 w-4 mr-2" />
                Track
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipments List */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredShipments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shipments found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search' : 'No shipments to track yet'}
              </p>
              {!searchTerm && (
                <p className="text-sm text-gray-500">
                  Shipments will appear here once created through sales orders
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredShipments.map((shipment) => (
            <Card key={shipment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {COURIER_LOGOS[shipment.courierName as keyof typeof COURIER_LOGOS] || '📦'}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {shipment.trackingNumber}
                      </CardTitle>
                      <p className="text-sm text-gray-500">
                        {shipment.courierName} • Order: {shipment.salesOrder?.orderNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(shipment.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => trackShipment(shipment.trackingNumber)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Update
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Route Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">From:</span>
                    </div>
                    <div className="text-sm">
                      {shipment.originAddress.city}, {shipment.originAddress.country}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">To:</span>
                    </div>
                    <div className="text-sm">
                      {shipment.destinationAddress.street}<br />
                      {shipment.destinationAddress.city}, {shipment.destinationAddress.state} {shipment.destinationAddress.zipCode}<br />
                      {shipment.destinationAddress.country}
                    </div>
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Last update:</span>
                      <span>{new Date(shipment.lastUpdated).toLocaleDateString()}</span>
                    </div>

                    {shipment.estimatedDelivery && (
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">ETA:</span>
                        <span>{new Date(shipment.estimatedDelivery).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {shipment.shippingCost && (
                    <div className="text-sm font-medium">
                      Cost: ${shipment.shippingCost.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Customer Information */}
                {shipment.salesOrder && (
                  <div className="pt-2 border-t">
                    <div className="text-sm text-gray-600">
                      Customer: {shipment.salesOrder.customer.name}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Truck className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {shipments.length}
              </p>
              <p className="text-sm text-gray-600">Total Shipments</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-yellow-600">🚛</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {shipments.filter(s => s.status === 'IN_TRANSIT').length}
              </p>
              <p className="text-sm text-gray-600">In Transit</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600">✅</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {shipments.filter(s => s.status === 'DELIVERED').length}
              </p>
              <p className="text-sm text-gray-600">Delivered</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-orange-600">📦</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {shipments.filter(s => s.status === 'OUT_FOR_DELIVERY').length}
              </p>
              <p className="text-sm text-gray-600">Out for Delivery</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
