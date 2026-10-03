'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePOS } from '@/hooks/usePOS';
import { ShoppingCart, CreditCard, DollarSign, Users } from 'lucide-react';

export default function POSPage() {
  const { currentSession, sessions, orders, loading } = usePOS();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-gray-600">Manage POS sessions and orders</p>
        </div>
        <div className="flex gap-3">
          {currentSession ? (
            <Button variant="destructive">Close Session</Button>
          ) : (
            <Button>Open New Session</Button>
          )}
        </div>
      </div>

      {/* Current Session */}
      {currentSession && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Current Session</p>
                <p className="text-2xl font-bold text-green-900">{currentSession.name}</p>
                <p className="text-sm text-green-600">
                  Started: {new Date(currentSession.startDate).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-700">Opening Cash</p>
                <p className="text-2xl font-bold text-green-900">
                  ${currentSession.openingCash.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard title="Total Sessions" value={sessions.length} icon={Users} />
        <StatsCard title="Today's Orders" value={orders.length} icon={ShoppingCart} />
        <StatsCard title="Revenue" value="$0" icon={DollarSign} />
        <StatsCard title="Avg Order" value="$0" icon={CreditCard} />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No sessions found</p>
                <Button variant="outline" className="mt-4">
                  Open First Session
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{session.name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(session.startDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs ${session.status === 'OPEN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                        }`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No orders found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">
                          {order.paymentMethod}
                        </p>
                      </div>
                      <p className="font-bold">${order.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
