"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Package, TrendingUp, Warehouse, AlertTriangle, ArrowUpDown, Truck } from 'lucide-react';

interface KPIData {
  activeProducts: number;
  alertProducts: number;
  pendingPOs: number;
  totalProducts: number;
  totalValue: number;
  warehouses: number;
}

interface RecentMovement {
  id: string;
  type: string;
  quantity: number;
  date: string;
  product: { name: string; sku: string };
}

export default function InventoryDashboard() {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchData() {
      try {
        const res = await fetch('/api/inventory/dashboard', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (!controller.signal.aborted) {
            setKpis(data.kpis);
            setRecentMovements(data.recentMovements);
          }
        } else {
          if (!controller.signal.aborted) setError('Failed to load Dashboard data');
        }
      } catch (e: any) {
        if (e.name !== 'AbortError' && !controller.signal.aborted) {
          setError(e.message || 'Error loading dashboard');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4">
        <p className="text-rose-500 font-medium">{error}</p>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded font-medium" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (loading || !kpis) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto bg-gray-50/30 min-h-screen">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Inventory Overview</h1>
        <p className="text-gray-500">
          Master dashboard tracking asset value, low stock warnings, and physical distribution.
        </p>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Stock Value"
          value={formatCurrency(kpis.totalValue)}
          subtitle="Value of storable physical goods"
          icon={TrendingUp}
          variant="emerald"
        />
        <StatCard
          title="Active Master Catalog Items"
          value={kpis.activeProducts.toString()}
          subtitle={`${kpis.totalProducts} total registered products`}
          icon={Package}
          variant="indigo"
        />
        <StatCard
          title="Low Stock Alerts"
          value={kpis.alertProducts.toString()}
          subtitle="Items below minimum threshold"
          icon={AlertTriangle}
          variant="rose"
        />
        <StatCard
          title="Pending Incoming Shipments"
          value={kpis.pendingPOs.toString()}
          subtitle="Purchase orders awaiting receipt"
          icon={Truck}
          variant="amber"
        />
      </div>

      {/* Main Content Grids */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2 shadow-sm border-gray-100">
          <CardHeader className="bg-white/50 pb-4 border-b border-gray-50">
            <CardTitle>Recent Intra-Module Stock Activity</CardTitle>
            <CardDescription>Live feed of physical consumption across operations</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentMovements.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No recent activity</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentMovements.map((move) => (
                  <div key={move.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${move.type === 'IN' || move.type === 'RETURN' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{move.product.name}</p>
                        <p className="text-xs text-gray-400">SKU: {move.product.sku} • {(() => { const d = new Date(move.date); return isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(d); })()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${move.type === 'IN' || move.type === 'RETURN' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {move.type === 'IN' || move.type === 'RETURN' ? '+' : '-'}{move.quantity}
                      </p>
                      <p className="text-xs text-gray-400">{move.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-6">
          <Card className="shadow-sm border-gray-100 bg-gradient-to-br from-indigo-50 to-blue-50/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <Warehouse className="h-5 w-5" />
                Active Network
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1 items-center justify-center p-6 text-indigo-900 bg-white/60 rounded-xl backdrop-blur-sm border border-indigo-100/50">
                <h2 className="text-4xl font-extrabold">{kpis.warehouses}</h2>
                <p className="text-sm font-medium opacity-80">Distribution Centers & Yards</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, subtitle, value, icon: Icon, variant }: any) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100'
  } as Record<string, string>;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-gray-100/60 bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-gray-900">
              {value}
            </p>
          </div>
          <div className={`p-3 rounded-xl border ${colors[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
