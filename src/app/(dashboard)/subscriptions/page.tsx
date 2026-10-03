'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react';

export default function SubscriptionsPage() {
  const { subscriptions, plans, metrics, loading } = useSubscriptions();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600">Manage recurring billing and subscriptions</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Create Plan</Button>
          <Button>New Subscription</Button>
        </div>
      </div>

      {/* Metrics */}
      {loading ? (
        <div className="text-center py-8">Loading metrics...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="MRR"
            value={`$${metrics?.mrr.toLocaleString() || 0}`}
            icon={DollarSign}
            color="green"
          />
          <MetricCard
            title="ARR"
            value={`$${metrics?.arr.toLocaleString() || 0}`}
            icon={TrendingUp}
            color="blue"
          />
          <MetricCard
            title="Active Subscriptions"
            value={metrics?.activeSubscriptions || 0}
            icon={Users}
            color="purple"
          />
          <MetricCard
            title="Churn Rate"
            value={`${metrics?.churnRate.toFixed(1) || 0}%`}
            icon={CreditCard}
            color="red"
          />
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : plans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No plans found</p>
                <Button variant="outline" className="mt-4">
                  Create First Plan
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{plan.name}</p>
                        <p className="text-sm text-gray-600">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${plan.price}</p>
                        <p className="text-xs text-gray-500">{plan.billingPeriod}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No subscriptions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Customer: {sub.customerId}</p>
                        <p className="text-sm text-gray-600">Plan: {sub.planId}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        sub.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                        sub.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {sub.status}
                      </span>
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

function MetricCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: 'blue' | 'green' | 'purple' | 'red' }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };
  const colorClass = colorClasses[color] || colorClasses.blue;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${colorClass}`}>
            <Icon className="h-6 w-6" />
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
