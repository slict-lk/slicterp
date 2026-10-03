'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, TrendingUp, DollarSign, LayoutGrid, List, ArrowLeft, ArrowRight, AlertTriangle, FileText } from 'lucide-react';

interface Opportunity {
  id: string;
  name: string;
  customerId: string;
  customer?: { id: string; name: string };
  stage: string;
  probability: number;
  expectedRevenue: number;
  expectedCloseDate: Date | null;
  description?: string;
  createdAt: Date;
}

interface OpportunityListProps {
  opportunities: Opportunity[];
  onCreateNew: () => void;
  onEdit: (opportunity: Opportunity) => void;
  onDelete: (opportunityId: string) => void;
  onView: (opportunity: Opportunity) => void;
  onStageChange?: (opportunity: Opportunity, nextStage: string) => Promise<void> | void;
}

type StageKey = 'PROSPECTING' | 'QUALIFICATION' | 'NEEDS_ANALYSIS' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';

const STAGES: { value: StageKey; label: string; prob: number; tone: string }[] = [
  { value: 'PROSPECTING', label: 'Prospecting', prob: 10, tone: 'border-slate-200 bg-slate-50' },
  { value: 'QUALIFICATION', label: 'Qualification', prob: 20, tone: 'border-blue-200 bg-blue-50' },
  { value: 'NEEDS_ANALYSIS', label: 'Needs Analysis', prob: 35, tone: 'border-cyan-200 bg-cyan-50' },
  { value: 'PROPOSAL', label: 'Proposal', prob: 55, tone: 'border-violet-200 bg-violet-50' },
  { value: 'NEGOTIATION', label: 'Negotiation', prob: 75, tone: 'border-amber-200 bg-amber-50' },
  { value: 'CLOSED_WON', label: 'Closed Won', prob: 100, tone: 'border-emerald-200 bg-emerald-50' },
  { value: 'CLOSED_LOST', label: 'Closed Lost', prob: 0, tone: 'border-rose-200 bg-rose-50' },
];

function normalizeStage(stage?: string | null): StageKey {
  const s = String(stage || '').toUpperCase();
  if (s === 'WON') return 'CLOSED_WON';
  if (s === 'LOST') return 'CLOSED_LOST';
  if (s === 'QUALIFIED') return 'QUALIFICATION';
  if (s === 'NEW') return 'PROSPECTING';
  if (s === 'PROPOSITION') return 'PROPOSAL';
  if (STAGES.some((x) => x.value === s)) return s as StageKey;
  return 'PROSPECTING';
}

function stageLabel(stage?: string | null) {
  const n = normalizeStage(stage);
  return STAGES.find((s) => s.value === n)?.label || n;
}

function stageBadge(stage?: string | null): 'default' | 'secondary' | 'outline' | 'destructive' {
  const n = normalizeStage(stage);
  if (n === 'CLOSED_WON') return 'default';
  if (n === 'CLOSED_LOST') return 'destructive';
  if (n === 'NEGOTIATION') return 'secondary';
  return 'outline';
}

function money(v?: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(v || 0));
}

function dateFmt(v?: Date | null) {
  if (!v) return 'No close date';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleDateString();
}

export function OpportunityList({ opportunities, onCreateNew, onEdit, onDelete, onView, onStageChange }: OpportunityListProps) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [filterStage, setFilterStage] = useState<'ALL' | StageKey>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      opportunities.map((o) => ({
        ...o,
        stage: normalizeStage(o.stage),
        probability: Number(o.probability || 0),
        expectedRevenue: Number(o.expectedRevenue || 0),
      })),
    [opportunities]
  );

  const filtered = useMemo(() => {
    return items.filter((o) => {
      const text = `${o.name} ${o.customer?.name || ''} ${o.description || ''}`.toLowerCase();
      return (search ? text.includes(search.toLowerCase()) : true) && (filterStage === 'ALL' ? true : o.stage === filterStage);
    });
  }, [items, search, filterStage]);

  const selected = filtered.find((o) => o.id === selectedId) || filtered[0] || null;
  const total = filtered.filter((o) => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)).reduce((s, o) => s + o.expectedRevenue, 0);
  const weighted = filtered.filter((o) => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)).reduce((s, o) => s + (o.expectedRevenue * o.probability) / 100, 0);
  const won = filtered.filter((o) => o.stage === 'CLOSED_WON').reduce((s, o) => s + o.expectedRevenue, 0);
  const closeSoon = filtered.filter((o) => {
    if (!o.expectedCloseDate || ['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)) return false;
    const t = new Date(o.expectedCloseDate).getTime();
    const now = Date.now();
    return t >= now && t <= now + 7 * 86400000;
  }).length;

  const columns = STAGES.map((stage) => {
    const col = filtered.filter((o) => o.stage === stage.value);
    return { ...stage, items: col, total: col.reduce((s, o) => s + o.expectedRevenue, 0) };
  });

  const queue = [...filtered]
    .filter((o) => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage))
    .sort((a, b) => (new Date(a.expectedCloseDate || 8640000000000000).getTime()) - (new Date(b.expectedCloseDate || 8640000000000000).getTime()))
    .slice(0, 5);

  const stageIndex = selected ? STAGES.findIndex((s) => s.value === selected.stage) : -1;
  const prevStage = stageIndex > 0 ? STAGES[stageIndex - 1].value : null;
  const nextStage = stageIndex >= 0 && stageIndex < STAGES.length - 1 ? STAGES[stageIndex + 1].value : null;

  async function moveStage(next: string) {
    if (!selected || !onStageChange) return;
    try {
      setBusyId(selected.id);
      await onStageChange(selected, next);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero banner with KPIs */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 p-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Opportunity Workspace</h2>
            <p className="text-sm text-blue-100">Pipeline board, deal inspector, and stage controls for real-time execution.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2"><div className="text-blue-100 text-xs">Open Pipeline</div><div className="font-semibold">{money(total)}</div></div>
            <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2"><div className="text-blue-100 text-xs">Weighted</div><div className="font-semibold">{money(weighted)}</div></div>
            <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2"><div className="text-blue-100 text-xs">Won</div><div className="font-semibold">{money(won)}</div></div>
            <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2"><div className="text-blue-100 text-xs">Closing 7d</div><div className="font-semibold">{closeSoon}</div></div>
          </div>
        </div>
      </div>

      {/* Toolbar: search, view toggle, filter, create */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" placeholder="Search opportunities, customers..." />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border p-1">
              <Button size="sm" variant={view === 'board' ? 'default' : 'ghost'} onClick={() => setView('board')}><LayoutGrid className="mr-1 h-4 w-4" />Board</Button>
              <Button size="sm" variant={view === 'list' ? 'default' : 'ghost'} onClick={() => setView('list')}><List className="mr-1 h-4 w-4" />List</Button>
            </div>
            <select className="h-9 rounded-md border px-3 text-sm" value={filterStage} onChange={(e) => setFilterStage(e.target.value as any)}>
              <option value="ALL">All stages</option>
              {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <Button onClick={onCreateNew}><Plus className="mr-2 h-4 w-4" />New Opportunity</Button>
          </div>
        </CardContent>
      </Card>

      {/* Deal Inspector + Attention Queue — side by side above the board */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Deal Inspector</CardTitle></CardHeader>
          <CardContent>
            {!selected ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">Select a deal to inspect and move stages.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-lg font-semibold">{selected.name}</p><p className="text-sm text-gray-500">{selected.customer?.name || 'No customer linked'}</p></div>
                  <Badge variant={stageBadge(selected.stage)}>{stageLabel(selected.stage)}</Badge>
                </div>
                {selected.description ? <p className="text-sm text-gray-600">{selected.description}</p> : null}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border bg-gray-50 p-3"><div className="text-xs text-gray-500">Expected</div><div className="font-semibold">{money(selected.expectedRevenue)}</div></div>
                  <div className="rounded-lg border bg-gray-50 p-3"><div className="text-xs text-gray-500">Probability</div><div className="font-semibold">{selected.probability}%</div></div>
                  <div className="rounded-lg border bg-gray-50 p-3"><div className="text-xs text-gray-500">Weighted</div><div className="font-semibold">{money((selected.expectedRevenue * selected.probability) / 100)}</div></div>
                  <div className="rounded-lg border bg-gray-50 p-3"><div className="text-xs text-gray-500">Close Date</div><div className="font-semibold">{dateFmt(selected.expectedCloseDate)}</div></div>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="mb-2 text-xs uppercase text-gray-500">Stage Controls</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={!prevStage || !onStageChange || !!busyId} onClick={() => prevStage && moveStage(prevStage)}><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Button>
                    <Button size="sm" disabled={!nextStage || !onStageChange || !!busyId} onClick={() => nextStage && moveStage(nextStage)}><ArrowRight className="mr-1 h-3.5 w-3.5" />{busyId === selected.id ? 'Moving...' : 'Advance'}</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => onEdit(selected)}><Edit className="mr-2 h-4 w-4" />Edit</Button>
                  <Button variant="outline" onClick={() => onView(selected)}>Open Form</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" />Attention Queue</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {queue.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-sm text-gray-500">No active deals need attention.</div> : queue.map((o) => (
              <button key={o.id} type="button" onClick={() => setSelectedId(o.id)} className={`w-full rounded-lg border p-3 text-left ${selected?.id === o.id ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-medium line-clamp-1">{o.name}</p><p className="text-xs text-gray-500">{o.customer?.name || 'No customer'} · {stageLabel(o.stage)}</p></div>
                  <span className="text-xs font-medium">{o.probability}%</span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-500"><span>{dateFmt(o.expectedCloseDate)}</span><span className="font-medium text-gray-900">{money(o.expectedRevenue)}</span></div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Board / List View — full width, responsive grid */}
      {view === 'board' ? (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Pipeline Board</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {columns.map((col) => (
                <div key={col.value} className={`rounded-2xl border p-3 ${col.tone}`}>
                  <div className="mb-3 rounded-xl bg-white/80 p-3">
                    <div className="flex items-center justify-between"><p className="font-semibold text-sm">{col.label}</p><Badge variant="outline">{col.items.length}</Badge></div>
                    <p className="mt-1 text-xs text-gray-500">{money(col.total)}</p>
                  </div>
                  <div className="space-y-3">
                    {col.items.length === 0 ? <div className="rounded-lg border border-dashed bg-white p-4 text-center text-xs text-gray-500">No deals</div> : col.items.map((o) => (
                      <button key={o.id} type="button" onClick={() => setSelectedId(o.id)} className={`w-full rounded-xl border bg-white p-3 text-left shadow-sm transition-all ${selected?.id === o.id ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200 hover:shadow-md'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><p className="font-medium text-sm line-clamp-1">{o.name}</p><p className="text-xs text-gray-500 truncate">{o.customer?.name || 'No customer'}</p></div>
                          <Badge variant={stageBadge(o.stage)} className="shrink-0">{o.probability}%</Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded bg-gray-50 p-2"><div className="text-gray-500">Value</div><div className="font-medium">{money(o.expectedRevenue)}</div></div>
                          <div className="rounded bg-gray-50 p-2"><div className="text-gray-500">Close</div><div className="font-medium">{dateFmt(o.expectedCloseDate)}</div></div>
                        </div>
                        <div className="mt-2 flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onEdit(o); }}><Edit className="h-3 w-3" /></Button>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete opportunity "${o.name}"?`)) onDelete(o.id); }}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">List View</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Opportunity</th>
                    <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Stage</th>
                    <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Close</th>
                    <th className="px-4 py-3 text-right text-xs uppercase text-gray-500">Value</th>
                    <th className="px-4 py-3 text-right text-xs uppercase text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedId(o.id)}>
                      <td className="px-4 py-3"><div className="font-medium">{o.name}</div><div className="text-xs text-gray-500">{o.description || 'No description'}</div></td>
                      <td className="px-4 py-3 text-sm">{o.customer?.name || 'Unassigned'}</td>
                      <td className="px-4 py-3"><Badge variant={stageBadge(o.stage)}>{stageLabel(o.stage)}</Badge></td>
                      <td className="px-4 py-3 text-sm">{dateFmt(o.expectedCloseDate)}</td>
                      <td className="px-4 py-3 text-right font-medium">{money(o.expectedRevenue)}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onEdit(o); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete opportunity "${o.name}"?`)) onDelete(o.id); }}><Trash2 className="h-3 w-3 text-red-500" /></Button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 ? <div className="p-6 text-center text-sm text-gray-500">No opportunities found.</div> : null}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
