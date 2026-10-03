'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, ShoppingBag, DollarSign, TrendingUp, ArrowLeft, ArrowRight, Truck, PackageCheck, AlertTriangle } from 'lucide-react';

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: { id: string; name: string };
  orderDate: Date;
  deliveryDate?: Date;
  status: string;
  total: number;
  lines: any[];
  createdAt: Date;
}

interface SalesOrderListProps {
  salesOrders: SalesOrder[];
  onCreateNew: () => void;
  onEdit: (order: SalesOrder) => void;
  onDelete: (orderId: string) => void;
  onView: (order: SalesOrder) => void;
  onStatusChange?: (order: SalesOrder, status: string) => Promise<void> | void;
}

const STATUSES = ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'] as const;

function money(v?: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(v || 0));
}
function dateFmt(v?: Date | null) {
  const d = v ? new Date(v) : null;
  return !d || Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}
function badgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  const s = String(status || '').toUpperCase();
  if (s === 'DELIVERED') return 'default';
  if (s === 'CANCELLED') return 'destructive';
  if (s === 'IN_PROGRESS') return 'secondary';
  return 'outline';
}

export function SalesOrderList({ salesOrders, onCreateNew, onEdit, onDelete, onView, onStatusChange }: SalesOrderListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return salesOrders.filter((o) => {
      const txt = `${o.orderNumber} ${o.customer?.name || ''}`.toLowerCase();
      return (search ? txt.includes(search.toLowerCase()) : true) && (statusFilter === 'ALL' ? true : String(o.status).toUpperCase() === statusFilter);
    });
  }, [salesOrders, search, statusFilter]);

  const selected = filtered.find((o) => o.id === selectedId) || filtered[0] || null;
  const total = filtered.filter((o) => String(o.status).toUpperCase() !== 'CANCELLED').reduce((s, o) => s + Number(o.total || 0), 0);
  const active = filtered.filter((o) => ['CONFIRMED', 'IN_PROGRESS'].includes(String(o.status).toUpperCase())).length;
  const delivered = filtered.filter((o) => String(o.status).toUpperCase() === 'DELIVERED').reduce((s, o) => s + Number(o.total || 0), 0);
  const overdueDelivery = filtered.filter((o) => {
    const s = String(o.status).toUpperCase();
    if (!o.deliveryDate || ['DELIVERED', 'CANCELLED'].includes(s)) return false;
    return new Date(o.deliveryDate).getTime() < Date.now();
  });

  const columns = STATUSES.map((status) => {
    const items = filtered.filter((o) => String(o.status).toUpperCase() === status);
    return { status, items, total: items.reduce((s, o) => s + Number(o.total || 0), 0) };
  });

  const idx = selected ? STATUSES.findIndex((s) => s === String(selected.status).toUpperCase()) : -1;
  const prevStatus = idx > 0 ? STATUSES[idx - 1] : null;
  const nextStatus = idx >= 0 && idx < STATUSES.length - 1 ? STATUSES[idx + 1] : null;

  async function run(fn?: () => Promise<void> | void, id?: string) {
    if (!fn) return;
    try {
      if (id) setBusyId(id);
      await fn();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-slate-900 via-emerald-900 to-teal-800 p-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Order Execution Desk</h2>
            <p className="text-sm text-emerald-100">Monitor confirmations, fulfillment progress, delivery status, and execution risk.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Tile label="Order Value" value={money(total)} />
            <Tile label="Active Orders" value={String(active)} />
            <Tile label="Delivered" value={money(delivered)} />
            <Tile label="Overdue Delivery" value={String(overdueDelivery.length)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric title="Total Value" value={money(total)} icon={<DollarSign className="h-5 w-5 text-blue-600" />} />
        <Metric title="Active Orders" value={String(active)} icon={<TrendingUp className="h-5 w-5 text-amber-600" />} />
        <Metric title="Delivered Value" value={money(delivered)} icon={<PackageCheck className="h-5 w-5 text-emerald-600" />} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input className="pl-10" placeholder="Search order or customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['ALL', ...STATUSES].map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)}>
                {s === 'ALL' ? 'All' : s}
              </Button>
            ))}
            <Button onClick={onCreateNew}><Plus className="mr-2 h-4 w-4" />New Sales Order</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Execution Board</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-[980px] gap-4">
                {columns.map((col) => (
                  <div key={col.status} className="w-[280px] rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-3 rounded-xl bg-white p-3">
                      <div className="flex items-center justify-between"><p className="font-semibold">{col.status}</p><Badge variant={badgeVariant(col.status)}>{col.items.length}</Badge></div>
                      <p className="mt-1 text-xs text-gray-500">{money(col.total)}</p>
                    </div>
                    <div className="space-y-3">
                      {col.items.length === 0 ? <div className="rounded-lg border border-dashed bg-white p-4 text-center text-xs text-gray-500">No orders</div> : col.items.map((o) => (
                        <button key={o.id} type="button" onClick={() => setSelectedId(o.id)} className={`w-full rounded-xl border bg-white p-3 text-left shadow-sm ${selected?.id === o.id ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div><p className="font-medium">{o.orderNumber}</p><p className="text-xs text-gray-500">{o.customer?.name || 'No customer'}</p></div>
                            <Badge variant={badgeVariant(o.status)}>{String(o.status).toUpperCase()}</Badge>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                            <span>{(o.lines || []).length} items</span>
                            <span className="font-medium text-gray-900">{money(o.total)}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">Delivery {dateFmt(o.deliveryDate)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Order Inspector</CardTitle></CardHeader>
            <CardContent>
              {!selected ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">Select an order to inspect and move status.</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-lg font-semibold">{selected.orderNumber}</p><p className="text-sm text-gray-500">{selected.customer?.name || 'No customer linked'}</p></div>
                    <Badge variant={badgeVariant(selected.status)}>{String(selected.status).toUpperCase()}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Box label="Total" value={money(selected.total)} />
                    <Box label="Items" value={String((selected.lines || []).length)} />
                    <Box label="Order Date" value={dateFmt(selected.orderDate)} />
                    <Box label="Delivery Date" value={dateFmt(selected.deliveryDate)} />
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="mb-2 text-xs uppercase text-gray-500">Execution Controls</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={!prevStatus || !onStatusChange || !!busyId} onClick={() => run(() => onStatusChange?.(selected, prevStatus!), selected.id)}>
                        <ArrowLeft className="mr-1 h-3.5 w-3.5" />Back
                      </Button>
                      <Button size="sm" disabled={!nextStatus || !onStatusChange || !!busyId} onClick={() => run(() => onStatusChange?.(selected, nextStatus!), selected.id)}>
                        <ArrowRight className="mr-1 h-3.5 w-3.5" />{busyId === selected.id ? 'Updating...' : 'Advance'}
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Next status: {nextStatus || 'None'}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => onEdit(selected)}><Edit className="mr-2 h-4 w-4" />Edit</Button>
                    <Button variant="outline" onClick={() => onView(selected)}>Open Form</Button>
                    <Button variant="outline" onClick={() => { if (confirm(`Delete order ${selected.orderNumber}?`)) onDelete(selected.id); }}>
                      <Trash2 className="mr-2 h-4 w-4 text-red-500" />Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" />Delivery Risk</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {overdueDelivery.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">No overdue deliveries.</div> : overdueDelivery.slice(0, 6).map((o) => (
                <button key={o.id} type="button" onClick={() => setSelectedId(o.id)} className={`w-full rounded-lg border p-3 text-left ${selected?.id === o.id ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-medium">{o.orderNumber}</p><p className="text-xs text-gray-500">{o.customer?.name || 'No customer'} · {String(o.status).toUpperCase()}</p></div>
                    <Truck className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-500"><span>Delivery {dateFmt(o.deliveryDate)}</span><span className="font-medium text-gray-900">{money(o.total)}</span></div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2"><div className="text-xs text-emerald-100">{label}</div><div className="font-semibold">{value}</div></div>;
}
function Metric({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-gray-500">{title}</p><p className="text-lg font-semibold">{value}</p></div><div className="rounded-lg bg-gray-50 p-2">{icon}</div></CardContent></Card>;
}
function Box({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-gray-50 p-3"><div className="text-xs text-gray-500">{label}</div><div className="font-medium">{value}</div></div>;
}
