'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, FileText, Clock3, ArrowRightLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Quotation {
  id: string;
  quotationNumber?: string;
  quoteNumber?: string;
  customerId: string;
  customer?: { id: string; name: string };
  validUntil: Date;
  status: string;
  total: number;
  lines: any[];
  createdAt: Date;
}

interface QuotationListProps {
  quotations: Quotation[];
  onCreateNew: () => void;
  onEdit: (quotation: Quotation) => void;
  onDelete: (quotationId: string) => void;
  onView: (quotation: Quotation) => void;
  onConvertToOrder?: (quotation: Quotation) => Promise<void> | void;
  onStatusChange?: (quotation: Quotation, status: string) => Promise<void> | void;
}

const STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;

function quoteNo(q: Quotation) {
  return q.quotationNumber || q.quoteNumber || q.id;
}
function money(v?: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(v || 0));
}
function dateFmt(v?: Date | null) {
  const d = v ? new Date(v) : null;
  return !d || Number.isNaN(d.getTime()) ? 'No date' : d.toLocaleDateString();
}
function badgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  const s = String(status || '').toUpperCase();
  if (s === 'ACCEPTED') return 'default';
  if (s === 'REJECTED' || s === 'EXPIRED') return 'destructive';
  if (s === 'SENT') return 'secondary';
  return 'outline';
}

export function QuotationList({ quotations, onCreateNew, onEdit, onDelete, onView, onConvertToOrder, onStatusChange }: QuotationListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const txt = `${quoteNo(q)} ${q.customer?.name || ''}`.toLowerCase();
      return (search ? txt.includes(search.toLowerCase()) : true) && (statusFilter === 'ALL' ? true : String(q.status).toUpperCase() === statusFilter);
    });
  }, [quotations, search, statusFilter]);

  const selected = filtered.find((q) => q.id === selectedId) || filtered[0] || null;
  const now = Date.now();
  const pendingValue = filtered.filter((q) => ['DRAFT', 'SENT'].includes(String(q.status).toUpperCase())).reduce((s, q) => s + Number(q.total || 0), 0);
  const acceptedValue = filtered.filter((q) => String(q.status).toUpperCase() === 'ACCEPTED').reduce((s, q) => s + Number(q.total || 0), 0);
  const expiringSoon = filtered.filter((q) => {
    const t = new Date(q.validUntil).getTime();
    return Number.isFinite(t) && t >= now && t <= now + 7 * 86400000 && !['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(String(q.status).toUpperCase());
  });

  const columns = STATUSES.map((status) => {
    const items = filtered.filter((q) => String(q.status).toUpperCase() === status);
    return { status, items, total: items.reduce((s, q) => s + Number(q.total || 0), 0) };
  });

  const convertable = filtered.filter((q) => !!q.customerId && !['REJECTED', 'EXPIRED'].includes(String(q.status).toUpperCase()));

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
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-800 p-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Quotation Desk</h2>
            <p className="text-sm text-blue-100">Track expiry risk, customer acceptance, and conversion readiness.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Tile label="Pending Value" value={money(pendingValue)} />
            <Tile label="Accepted Value" value={money(acceptedValue)} />
            <Tile label="Expiring 7d" value={String(expiringSoon.length)} />
            <Tile label="Convertible" value={String(convertable.length)} />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input className="pl-10" placeholder="Search quotation or customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['ALL', ...STATUSES].map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)}>
                {s === 'ALL' ? 'All' : s}
              </Button>
            ))}
            <Button onClick={onCreateNew}><Plus className="mr-2 h-4 w-4" />New Quotation</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Status Board</CardTitle></CardHeader>
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
                      {col.items.length === 0 ? <div className="rounded-lg border border-dashed bg-white p-4 text-center text-xs text-gray-500">No quotes</div> : col.items.map((q) => (
                        <button key={q.id} type="button" onClick={() => setSelectedId(q.id)} className={`w-full rounded-xl border bg-white p-3 text-left shadow-sm ${selected?.id === q.id ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div><p className="font-medium">{quoteNo(q)}</p><p className="text-xs text-gray-500">{q.customer?.name || 'No customer'}</p></div>
                            <Badge variant={badgeVariant(q.status)}>{String(q.status).toUpperCase()}</Badge>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                            <span>{(q.lines || []).length} lines</span>
                            <span className="font-medium text-gray-900">{money(q.total)}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">Valid until {dateFmt(q.validUntil)}</div>
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
            <CardHeader className="pb-3"><CardTitle className="text-base">Quote Inspector</CardTitle></CardHeader>
            <CardContent>
              {!selected ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">Select a quotation to review and act on it.</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-lg font-semibold">{quoteNo(selected)}</p><p className="text-sm text-gray-500">{selected.customer?.name || 'No customer linked'}</p></div>
                    <Badge variant={badgeVariant(selected.status)}>{String(selected.status).toUpperCase()}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Box label="Total" value={money(selected.total)} />
                    <Box label="Lines" value={String((selected.lines || []).length)} />
                    <Box label="Valid Until" value={dateFmt(selected.validUntil)} />
                    <Box label="Created" value={dateFmt(selected.createdAt)} />
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="mb-2 text-xs uppercase text-gray-500">Actions</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => onEdit(selected)}><Edit className="mr-2 h-4 w-4" />Edit</Button>
                      <Button variant="outline" onClick={() => onView(selected)}>Open Form</Button>
                      {onConvertToOrder ? (
                        <Button disabled={busyId === selected.id || !selected.customerId} onClick={() => run(() => onConvertToOrder(selected), selected.id)}>
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          {busyId === selected.id ? 'Converting...' : 'Convert to Order'}
                        </Button>
                      ) : null}
                    </div>
                    {onStatusChange ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'].map((s) => (
                          <Button key={s} size="sm" variant="outline" disabled={busyId === selected.id || String(selected.status).toUpperCase() === s} onClick={() => run(() => onStatusChange(selected, s), selected.id)}>
                            {s}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" />Expiry Watch</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {expiringSoon.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">No quotes expiring in the next 7 days.</div> : expiringSoon.slice(0, 6).map((q) => {
                const daysLeft = Math.ceil((new Date(q.validUntil).getTime() - now) / 86400000);
                return (
                  <button key={q.id} type="button" onClick={() => setSelectedId(q.id)} className={`w-full rounded-lg border p-3 text-left ${selected?.id === q.id ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div><p className="font-medium">{quoteNo(q)}</p><p className="text-xs text-gray-500">{q.customer?.name || 'No customer'}</p></div>
                      <Badge variant={daysLeft <= 2 ? 'destructive' : 'secondary'}>{daysLeft >= 0 ? `${daysLeft}d` : 'Expired'}</Badge>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-gray-500"><span>{dateFmt(q.validUntil)}</span><span className="font-medium text-gray-900">{money(q.total)}</span></div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4 text-green-600" />Conversion Queue</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {convertable.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">No convertible quotes available.</div> : convertable.slice(0, 6).map((q) => (
                <div key={q.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-medium">{quoteNo(q)}</p><p className="text-xs text-gray-500">{q.customer?.name || 'No customer'}</p></div>
                    <Badge variant={badgeVariant(q.status)}>{String(q.status).toUpperCase()}</Badge>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-500"><span>{money(q.total)}</span><span><Clock3 className="mr-1 inline h-3 w-3" />{dateFmt(q.validUntil)}</span></div>
                  {onConvertToOrder ? (
                    <Button className="mt-2 w-full" size="sm" disabled={busyId === q.id || !q.customerId} onClick={() => run(() => onConvertToOrder(q), q.id)}>
                      {busyId === q.id ? 'Converting...' : 'Convert to Order'}
                    </Button>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2"><div className="text-xs text-blue-100">{label}</div><div className="font-semibold">{value}</div></div>;
}
function Box({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-gray-50 p-3"><div className="text-xs text-gray-500">{label}</div><div className="font-medium">{value}</div></div>;
}
