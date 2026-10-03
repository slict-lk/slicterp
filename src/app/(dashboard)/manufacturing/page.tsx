"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Factory, Package, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { BOMList } from '@/components/modules/manufacturing/BOMList';
import { WorkOrderList } from '@/components/modules/manufacturing/WorkOrderList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useManufacturing } from '@/hooks/useManufacturing';

export default function ManufacturingPage() {
  const { boms, orders, loading, reload } = useManufacturing();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const activeOrders = useMemo(() => {
    return orders.filter(
      (order) => order.status === 'IN_PROGRESS' || order.status === 'CONFIRMED'
    ).length;
  }, [orders]);

  const efficiency = useMemo(() => {
    const completed = orders.filter((order) => order.status === 'DONE').length;
    const total = orders.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [orders]);

  const alerts = useMemo(() => {
    return orders.filter(
      (order) => order.status === 'DRAFT' && !order.startDate
    ).length;
  }, [orders]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manufacturing (MRP)</h1>
          <p className="text-gray-600">
            Plan production, manage bills of materials, and track work orders.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">Create BOM</Button>
          <Button>New Work Order</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Active Work Orders"
          value={activeOrders.toString()}
          subtitle="In progress & confirmed"
          icon={Factory}
          color="blue"
        />
        <StatsCard
          title="BOMs"
          value={boms.length.toString()}
          subtitle="Bill of materials"
          icon={Package}
          color="green"
        />
        <StatsCard
          title="Efficiency"
          value={`${efficiency}%`}
          subtitle="Completion rate"
          icon={TrendingUp}
          color="purple"
        />
        <StatsCard
          title="Alerts"
          value={alerts.toString()}
          subtitle="Unscheduled orders"
          icon={AlertCircle}
          color="red"
        />
      </div>

      {/* Main Content - Using Real API Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BOMList />
        <WorkOrderList />
      </div>

      {/* Production Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Production Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Factory className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>Production schedule view coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Factory;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  }[color];

  return (
    <Card className="border border-gray-200">
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className={`rounded-xl p-3 ${colorClasses}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function BOMItem({
  code,
  product,
  components,
}: {
  code: string;
  product: string;
  components: number;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
      <div>
        <p className="font-medium">{code}</p>
        <p className="text-sm text-gray-600">{product}</p>
      </div>
      <div className="text-sm text-gray-500">{components} components</div>
    </div>
  );
}

function WorkOrderItem({
  id,
  product,
  quantity,
  status,
}: {
  id: string;
  product: string;
  quantity: number;
  status: string;
}) {
  const statusColors = {
    'In Progress': 'bg-blue-100 text-blue-700',
    'Scheduled': 'bg-yellow-100 text-yellow-700',
    'Completed': 'bg-green-100 text-green-700',
  }[status] || 'bg-gray-100 text-gray-700';

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="font-medium">{id}</p>
        <p className="text-sm text-gray-600">{product} × {quantity}</p>
      </div>
      <span className={`text-xs px-3 py-1 rounded-full ${statusColors}`}>
        {status}
      </span>
    </div>
  );
}
