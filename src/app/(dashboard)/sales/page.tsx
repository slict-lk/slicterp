"use client";

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Users,
  TrendingUp,
  ShoppingCart,
  Filter,
  RefreshCw,
  CalendarCheck,
  Target,
  Phone,
  Mail,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Clock3,
  FileText,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  priority: string;
  expectedRevenue: number;
  probability: number;
  createdAt: string;
  customer?: { name: string } | null;
}

interface Opportunity {
  id: string;
  name: string;
  amount: number;
  probability: number;
  stage: string;
  expectedCloseDate: string | null;
  customer?: { name: string } | null;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  customer?: { name: string } | null;
}

interface Quotation {
  id: string;
  quoteNumber: string;
  status: string;
  total: number;
  createdAt: string;
  validUntil: string;
  customerId?: string | null;
  currency?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  lines?: Array<{
    id?: string;
    productId?: string | null;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    discount?: number;
    tax?: number;
    subtotal?: number;
  }>;
  customer?: { name: string } | null;
}

interface SalesStats {
  leadCount: number;
  activeOpportunities: number;
  pipelineValue: number;
  winRate: number;
  quoteToOrder: number;
}



function formatDate(date?: string | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(date)
  );
}

export default function SalesPage() {
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    leadStatus: 'ALL',
    leadPriority: 'ALL',
    pipelineStage: 'ALL',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [statsRes, leadsRes, oppRes, ordersRes, quotesRes] = await Promise.all([
        fetch('/api/sales/metrics'),
        fetch('/api/sales/leads'),
        fetch('/api/sales/opportunities'),
        fetch('/api/sales/orders?status=CONFIRMED'),
        fetch('/api/sales/quotations'),
      ]);

      if (!statsRes.ok) throw new Error('Failed to load sales metrics');
      if (!leadsRes.ok) throw new Error('Failed to load leads');
      if (!oppRes.ok) throw new Error('Failed to load opportunities');
      if (!ordersRes.ok) throw new Error('Failed to load orders');
      if (!quotesRes.ok) throw new Error('Failed to load quotations');

      const statsPayload = await statsRes.json();
      setStats(statsPayload.data || statsPayload);

      const leadsPayload = await leadsRes.json();
      setLeads(leadsPayload.items || leadsPayload.data || (Array.isArray(leadsPayload) ? leadsPayload : []));

      const oppPayload = await oppRes.json();
      setOpportunities(oppPayload.items || oppPayload.data || (Array.isArray(oppPayload) ? oppPayload : []));

      const ordersPayload = await ordersRes.json();
      setOrders(ordersPayload.items || ordersPayload.data || (Array.isArray(ordersPayload) ? ordersPayload : []));

      const quotesPayload = await quotesRes.json();
      setQuotations(quotesPayload.items || quotesPayload.data || (Array.isArray(quotesPayload) ? quotesPayload : []));
    } catch (error) {
      console.error(error);
      setLeads([]);
      setOpportunities([]);
      setOrders([]);
      setQuotations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => setActionNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  const filteredLeads = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    return leads
      .filter((lead) =>
        searchTerm
          ? lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.email.toLowerCase().includes(searchTerm.toLowerCase())
          : true
      )
      .filter((lead) => (filters.leadStatus === 'ALL' ? true : lead.status === filters.leadStatus))
      .filter((lead) => (filters.leadPriority === 'ALL' ? true : lead.priority === filters.leadPriority));
  }, [leads, searchTerm, filters.leadStatus, filters.leadPriority]);

  const filteredOpportunities = useMemo(() => {
    if (!Array.isArray(opportunities)) return [];
    return opportunities.filter((opportunity) =>
      filters.pipelineStage === 'ALL' ? true : opportunity.stage === filters.pipelineStage
    );
  }, [opportunities, filters.pipelineStage]);

  const stageColumns = useMemo(() => {
    const stages = [
      { key: 'QUALIFICATION', label: 'Qualification' },
      { key: 'PROSPECTING', label: 'Prospecting' },
      { key: 'PROPOSAL', label: 'Proposal' },
      { key: 'NEGOTIATION', label: 'Negotiation' },
      { key: 'WON', label: 'Closed Won' },
      { key: 'LOST', label: 'Closed Lost' },
    ];

    const map = new Map<string, Opportunity[]>();
    for (const stage of stages) map.set(stage.key, []);
    const others: Opportunity[] = [];

    for (const opp of filteredOpportunities) {
      const key = String(opp.stage || '').toUpperCase();
      if (map.has(key)) {
        map.get(key)!.push(opp);
      } else {
        others.push(opp);
      }
    }

    const columns = stages.map((stage) => {
      const variants = map.get(stage.key) || [];
      const amount = variants.reduce((sum, o) => sum + Number(o.amount || 0), 0);
      const weighted = variants.reduce((sum, o) => sum + (Number(o.amount || 0) * Number(o.probability || 0)) / 100, 0);
      return { ...stage, items: variants, amount, weighted };
    });

    if (others.length) {
      columns.push({
        key: 'OTHER',
        label: 'Other',
        items: others,
        amount: others.reduce((sum, o) => sum + Number(o.amount || 0), 0),
        weighted: others.reduce((sum, o) => sum + (Number(o.amount || 0) * Number(o.probability || 0)) / 100, 0),
      });
    }

    return columns;
  }, [filteredOpportunities]);

  const actionCenter = useMemo(() => {
    const now = Date.now();
    const in7Days = now + 7 * 24 * 60 * 60 * 1000;

    const highPriorityLeadCount = filteredLeads.filter((lead) => ['HIGH', 'URGENT'].includes(String(lead.priority || '').toUpperCase())).length;
    const quoteExpiringSoon = quotations.filter((quote) => {
      if (!quote.validUntil) return false;
      const t = new Date(quote.validUntil).getTime();
      return t >= now && t <= in7Days && !['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(String(quote.status || '').toUpperCase());
    }).length;
    const closingSoon = opportunities.filter((opp) => {
      if (!opp.expectedCloseDate) return false;
      const t = new Date(opp.expectedCloseDate).getTime();
      return t >= now && t <= in7Days && !['WON', 'LOST'].includes(String(opp.stage || '').toUpperCase());
    }).length;
    const unassignedLeads = filteredLeads.filter((lead) => !lead.customer?.name).length;

    return { highPriorityLeadCount, quoteExpiringSoon, closingSoon, unassignedLeads };
  }, [filteredLeads, quotations, opportunities]);

  const weightedPipeline = useMemo(
    () => opportunities.reduce((sum, opp) => sum + (Number(opp.amount || 0) * Number(opp.probability || 0)) / 100, 0),
    [opportunities]
  );

  const expiringQuotes = useMemo(() => {
    const now = Date.now();
    return [...quotations]
      .filter((quote) => quote.validUntil)
      .map((quote) => ({ ...quote, _validTs: new Date(quote.validUntil).getTime() }))
      .filter((quote) => Number.isFinite(quote._validTs))
      .sort((a, b) => a._validTs - b._validTs)
      .slice(0, 5);
  }, [quotations]);

  const topLeads = useMemo(() => {
    return [...filteredLeads]
      .sort((a, b) => {
        const scoreA = (a.priority === 'URGENT' ? 4 : a.priority === 'HIGH' ? 3 : a.priority === 'MEDIUM' ? 2 : 1);
        const scoreB = (b.priority === 'URGENT' ? 4 : b.priority === 'HIGH' ? 3 : b.priority === 'MEDIUM' ? 2 : 1);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return Number(b.expectedRevenue || 0) - Number(a.expectedRevenue || 0);
      })
      .slice(0, 5);
  }, [filteredLeads]);

  const staleOpportunities = useMemo(() => {
    return [...opportunities]
      .filter((opp) => !['WON', 'LOST'].includes(String(opp.stage || '').toUpperCase()))
      .sort((a, b) => {
        const ad = a.expectedCloseDate ? new Date(a.expectedCloseDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bd = b.expectedCloseDate ? new Date(b.expectedCloseDate).getTime() : Number.MAX_SAFE_INTEGER;
        return ad - bd;
      })
      .slice(0, 4);
  }, [opportunities]);

  const convertibleQuotes = useMemo(
    () =>
      quotations.filter(
        (quote) =>
          !!quote.customerId &&
          !['REJECTED', 'EXPIRED'].includes(String(quote.status || '').toUpperCase())
      ),
    [quotations]
  );

  const handleConvertQuoteToOrder = useCallback(
    async (quote: Quotation) => {
      if (!quote.customerId) {
        setActionNotice('Quote has no customer linked');
        return;
      }
      try {
        setConvertingQuoteId(quote.id);
        setActionNotice(null);
        const orderRes = await fetch('/api/sales/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: `SO-${Date.now()}`,
            customerId: quote.customerId,
            status: 'CONFIRMED',
            sourceQuotationId: quote.id,
            notes: `Converted from quotation ${quote.quoteNumber}`,
            lines: (quote.lines || []).map((line) => ({
              productId: line.productId ?? null,
              description: line.description ?? 'Item',
              quantity: Number(line.quantity ?? 0),
              unitPrice: Number(line.unitPrice ?? 0),
              discount: Number(line.discount ?? 0),
              tax: Number(line.tax ?? 0),
            })),
          }),
        });

        if (!orderRes.ok) {
          const payload = await orderRes.json().catch(() => ({}));
          throw new Error(payload?.error || 'Failed to convert quote');
        }

        await fetch(`/api/sales/quotations/${quote.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACCEPTED' }),
        }).catch(() => undefined);

        setActionNotice(`Converted ${quote.quoteNumber} to sales order`);
        await fetchData();
      } catch (error: any) {
        setActionNotice(error?.message || 'Quote conversion failed');
      } finally {
        setConvertingQuoteId(null);
      }
    },
    [fetchData]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales & CRM</h1>
          <p className="text-gray-600">
            Manage leads, track opportunities, and monitor performance across the entire pipeline.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Input
              placeholder="Search leads or opportunities..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Filter className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <Button variant="outline" onClick={fetchData} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {actionNotice ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {actionNotice}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Pipeline Value"
          value={formatCurrency(stats?.pipelineValue ?? 0)}
          subtitle="Total potential revenue"
          icon={DollarSign}
          variant="teal"
        />
        <StatCard
          title="Active Opportunities"
          value={String(stats?.activeOpportunities ?? 0)}
          subtitle="Open deals in pipeline"
          icon={TrendingUp}
          variant="sky"
        />
        <StatCard
          title="Qualified Leads"
          value={String(stats?.leadCount ?? 0)}
          subtitle="Ready for follow-up"
          icon={Users}
          variant="indigo"
        />
        <StatCard
          title="Win Rate"
          value={`${stats?.winRate ?? 0}%`}
          subtitle="Closed vs lost deals"
          icon={Target}
          variant="amber"
        />
        <StatCard
          title="Quote → Order"
          value={`${stats?.quoteToOrder ?? 0}%`}
          subtitle="Conversion efficiency"
          icon={ShoppingCart}
          variant="purple"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-gray-200">
          <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 p-6 text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                  <BarChart3 className="h-3.5 w-3.5" /> Revenue Command Center
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Operational sales pulse for the current pipeline</h2>
                <p className="max-w-2xl text-sm text-blue-100">
                  Monitor weighted forecast, upcoming closures, quote expiry risk, and high-priority follow-ups in one place.
                </p>
              </div>
              <div className="grid min-w-[260px] grid-cols-2 gap-3">
                <CommandPill label="Weighted Pipeline" value={formatCurrency(weightedPipeline)} />
                <CommandPill label="Closing Soon" value={String(actionCenter.closingSoon)} />
                <CommandPill label="High Priority Leads" value={String(actionCenter.highPriorityLeadCount)} />
                <CommandPill label="Expiring Quotes" value={String(actionCenter.quoteExpiringSoon)} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/sales/leads">
                <Button size="sm" className="bg-white text-slate-900 hover:bg-blue-50">
                  Open Leads Queue <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sales/opportunities">
                <Button size="sm" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10">
                  Pipeline Workspace
                </Button>
              </Link>
              <Link href="/sales/quotations">
                <Button size="sm" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10">
                  Quote Desk
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Action Center
            </CardTitle>
            <CardDescription>Risk and follow-up items that need operator attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ActionCenterRow
              icon={<Clock3 className="h-4 w-4 text-orange-500" />}
              title="Quotes expiring in 7 days"
              value={String(actionCenter.quoteExpiringSoon)}
              hint="Review validity or send reminders"
            />
            <ActionCenterRow
              icon={<Target className="h-4 w-4 text-blue-600" />}
              title="Deals closing this week"
              value={String(actionCenter.closingSoon)}
              hint="Confirm next actions and probabilities"
            />
            <ActionCenterRow
              icon={<Users className="h-4 w-4 text-indigo-600" />}
              title="Unassigned leads"
              value={String(actionCenter.unassignedLeads)}
              hint="Link to customers or assign owners"
            />
            <ActionCenterRow
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              title="High-priority leads"
              value={String(actionCenter.highPriorityLeadCount)}
              hint="Prioritize outreach and qualification"
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="orders">Orders & Quotes</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Priority Follow-up Queue</CardTitle>
                <CardDescription>Highest-value and highest-priority leads to work first.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingState message="Preparing lead queue..." />
                ) : topLeads.length === 0 ? (
                  <EmptyState message="No leads available for prioritization." />
                ) : (
                  <div className="space-y-3">
                    {topLeads.map((lead) => (
                      <div key={lead.id} className="flex items-start justify-between rounded-xl border border-gray-200 p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{lead.name}</p>
                            <Badge variant={priorityVariant(lead.priority)}>{lead.priority}</Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            {lead.email || 'No email'} {lead.phone ? `· ${lead.phone}` : ''}
                          </p>
                          <p className="text-xs text-gray-500">
                            {lead.customer?.name ? `Linked to ${lead.customer.name}` : 'Not linked to customer'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(lead.expectedRevenue ?? 0)}</p>
                          <p className="text-xs text-gray-500">{lead.probability ?? 0}% probability</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expiry & Conversion Watch</CardTitle>
                <CardDescription>Quotes approaching expiry and ready for action.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingState message="Loading quote watchlist..." />
                ) : expiringQuotes.length === 0 ? (
                  <EmptyState message="No quote expiry risk detected." />
                ) : (
                  <div className="space-y-3">
                    {expiringQuotes.map((quote) => {
                      const daysLeft = Math.ceil((new Date(quote.validUntil).getTime() - Date.now()) / 86400000);
                      return (
                        <div key={quote.id} className="rounded-xl border border-gray-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-900">{quote.quoteNumber}</p>
                              <p className="text-xs text-gray-500">{quote.customer?.name ?? 'Unassigned customer'}</p>
                            </div>
                            <Badge variant={daysLeft <= 2 ? 'destructive' : 'secondary'}>
                              {daysLeft >= 0 ? `${daysLeft}d left` : 'Expired'}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-gray-500">Value</span>
                            <span className="font-medium text-gray-900">{formatCurrency(quote.total ?? 0)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Lead Qualification</CardTitle>
                <CardDescription>Track new leads and prioritize follow-ups.</CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                  value={filters.leadStatus}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, leadStatus: value }))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="QUALIFIED">Qualified</SelectItem>
                    <SelectItem value="PROPOSITION">Proposal Sent</SelectItem>
                    <SelectItem value="WON">Won</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.leadPriority}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, leadPriority: value }))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState message="Loading leads..." />
              ) : filteredLeads.length === 0 ? (
                <EmptyState message="No leads found for the selected filters." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Lead</th>
                        <th className="px-4 py-3 text-left">Contact</th>
                        <th className="px-4 py-3 text-left">Priority</th>
                        <th className="px-4 py-3 text-left">Expected Revenue</th>
                        <th className="px-4 py-3 text-left">Probability</th>
                        <th className="px-4 py-3 text-left">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">{lead.name}</span>
                              <span className="text-xs text-gray-500">
                                {lead.customer?.name ? `Linked to ${lead.customer.name}` : 'Unassigned'}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                                <Mail className="h-3.5 w-3.5 text-gray-400" /> {lead.email || '—'}
                              </span>
                              <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                                <Phone className="h-3.5 w-3.5 text-gray-400" /> {lead.phone || '—'}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Badge variant={priorityVariant(lead.priority)}>{lead.priority}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium">
                            {formatCurrency(lead.expectedRevenue ?? 0)}
                          </td>
                          <td className="px-4 py-3">
                            <ProbabilityBar value={lead.probability ?? 0} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                            {formatDate(lead.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Pipeline Stages</CardTitle>
                <CardDescription>Monitor deal velocity and conversion rates.</CardDescription>
              </div>
              <Select
                value={filters.pipelineStage}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, pipelineStage: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Stages</SelectItem>
                  <SelectItem value="PROSPECTING">Prospecting</SelectItem>
                  <SelectItem value="QUALIFICATION">Qualification</SelectItem>
                  <SelectItem value="PROPOSAL">Proposal</SelectItem>
                  <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                  <SelectItem value="WON">Won</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <LoadingState message="Loading pipeline..." />
              ) : filteredOpportunities.length === 0 ? (
                <EmptyState message="No opportunities in the selected stage." />
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-gray-200 shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Total Open Pipeline</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900">
                          {formatCurrency(
                            filteredOpportunities.reduce((sum, opp) => sum + Number(opp.amount || 0), 0)
                          )}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-gray-200 shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Weighted Forecast</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900">
                          {formatCurrency(
                            filteredOpportunities.reduce(
                              (sum, opp) => sum + (Number(opp.amount || 0) * Number(opp.probability || 0)) / 100,
                              0
                            )
                          )}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-gray-200 shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Active Deals</p>
                        <p className="mt-1 text-xl font-semibold text-gray-900">{filteredOpportunities.length}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="overflow-x-auto pb-2">
                    <div className="flex min-w-[980px] gap-4">
                      {stageColumns.map((column) => (
                        <PipelineStageColumn key={column.key} column={column} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Close Commitments</CardTitle>
              <CardDescription>Deals that should be reviewed for next-step confidence.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState message="Loading close commitments..." />
              ) : staleOpportunities.length === 0 ? (
                <EmptyState message="No active opportunities to review." />
              ) : (
                <div className="space-y-3">
                  {staleOpportunities.map((opportunity) => (
                    <div key={opportunity.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                      <div>
                        <p className="font-semibold text-gray-900">{opportunity.name}</p>
                        <p className="text-xs text-gray-500">
                          {opportunity.customer?.name ?? 'Unassigned customer'} · {String(opportunity.stage || 'UNKNOWN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(opportunity.amount ?? 0)}</p>
                        <p className="text-xs text-gray-500">Close: {formatDate(opportunity.expectedCloseDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Quote Conversion Desk</CardTitle>
                <CardDescription>
                  Convert approved/active quotations into confirmed orders and keep pipeline execution moving.
                </CardDescription>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {convertibleQuotes.length} convertible quotes
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState message="Loading quote conversion queue..." />
              ) : convertibleQuotes.length === 0 ? (
                <EmptyState message="No convertible quotations found. Create or send quotes to start conversion flow." />
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {convertibleQuotes.slice(0, 6).map((quote) => {
                    const status = String(quote.status || '').toUpperCase();
                    const canConvert = !!quote.customerId && status !== 'REJECTED' && status !== 'EXPIRED';
                    return (
                      <div key={quote.id} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{quote.quoteNumber}</p>
                            <p className="text-xs text-gray-500">{quote.customer?.name ?? 'Unassigned customer'}</p>
                          </div>
                          <Badge variant={quoteStatusVariant(quote.status)}>{quote.status}</Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs uppercase text-gray-500">Amount</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(quote.total ?? 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-500">Valid Until</p>
                            <p className="font-semibold text-gray-900">{formatDate(quote.validUntil)}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {(quote.lines || []).length} lines · {quote.customerId ? 'Customer linked' : 'Customer missing'}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleConvertQuoteToOrder(quote)}
                            disabled={!canConvert || convertingQuoteId === quote.id}
                          >
                            {convertingQuoteId === quote.id ? 'Converting...' : 'Convert to Order'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Confirmed orders in the last 30 days.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingState message="Loading orders..." />
                ) : orders.length === 0 ? (
                  <EmptyState message="No sales orders yet." />
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 6).map((order) => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quotations</CardTitle>
                <CardDescription>Pending approvals and expirations.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingState message="Loading quotations..." />
                ) : quotations.length === 0 ? (
                  <EmptyState message="No quotations available." />
                ) : (
                  <div className="space-y-3">
                    {quotations.slice(0, 6).map((quote) => (
                      <QuoteRow key={quote.id} quotation={quote} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CommandPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-wide text-blue-100/90">{label}</p>
      <p className="text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function ActionCenterRow({
  icon,
  title,
  value,
  hint,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-gray-200 p-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-gray-50 p-2">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{hint}</p>
        </div>
      </div>
      <div className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function PipelineStageColumn({
  column,
}: {
  column: {
    key: string;
    label: string;
    items: Opportunity[];
    amount: number;
    weighted: number;
  };
}) {
  const tone =
    column.key === 'WON'
      ? 'border-emerald-200 bg-emerald-50/60'
      : column.key === 'LOST'
        ? 'border-rose-200 bg-rose-50/60'
        : 'border-gray-200 bg-gray-50/60';

  return (
    <div className={`w-[300px] rounded-2xl border p-3 ${tone}`}>
      <div className="mb-3 rounded-xl bg-white/80 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-gray-900">{column.label}</p>
          <Badge variant="outline">{column.items.length}</Badge>
        </div>
        <div className="mt-2 space-y-1 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span>Stage Value</span>
            <span className="font-medium text-gray-900">{formatCurrency(column.amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Weighted</span>
            <span className="font-medium text-gray-900">{formatCurrency(column.weighted)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {column.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white/70 px-3 py-6 text-center text-xs text-gray-500">
            No deals in this stage
          </div>
        ) : (
          column.items.slice(0, 6).map((opportunity) => (
            <div key={opportunity.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="line-clamp-1 font-medium text-gray-900">{opportunity.name}</p>
                  <p className="text-xs text-gray-500">{opportunity.customer?.name ?? 'Unassigned customer'}</p>
                </div>
                <Badge variant={stageVariant(opportunity.stage)}>{String(opportunity.stage || 'UNKNOWN')}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-gray-50 p-2">
                  <p className="text-gray-500">Amount</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(opportunity.amount ?? 0)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <p className="text-gray-500">Prob.</p>
                  <p className="font-semibold text-gray-900">{opportunity.probability ?? 0}%</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Close {formatDate(opportunity.expectedCloseDate)}</span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Weighted {formatCurrency(((opportunity.amount ?? 0) * (opportunity.probability ?? 0)) / 100)}
                </span>
              </div>
            </div>
          ))
        )}
        {column.items.length > 6 ? (
          <div className="rounded-lg bg-white/80 px-3 py-2 text-center text-xs text-gray-600">
            +{column.items.length - 6} more deals
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({
  title,
  subtitle,
  value,
  icon: Icon,
  variant,
}: {
  title: string;
  subtitle: string;
  value: string;
  icon: typeof DollarSign;
  variant: 'teal' | 'sky' | 'indigo' | 'amber' | 'purple';
}) {
  const accentMap: Record<typeof variant, string> = {
    teal: 'bg-teal-100 text-teal-600',
    sky: 'bg-sky-100 text-sky-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
  } as const;

  return (
    <Card className="border border-gray-200">
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className={`rounded-xl p-3 ${accentMap[variant]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-gray-500">
      {message}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-sm text-gray-500">
      {message}
    </div>
  );
}

function priorityVariant(priority: string) {
  switch (priority) {
    case 'URGENT':
      return 'destructive';
    case 'HIGH':
      return 'default';
    case 'MEDIUM':
      return 'secondary';
    default:
      return 'outline';
  }
}

function ProbabilityBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{safeValue}%</span>
        <span>100%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-teal-500" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function PipelineCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{opportunity.name}</h3>
          <p className="text-sm text-gray-500">
            {opportunity.customer?.name ? `Customer: ${opportunity.customer.name}` : 'Unassigned'}
          </p>
        </div>
        <Badge variant={stageVariant(opportunity.stage)}>{opportunity.stage}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase text-gray-500">Amount</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(opportunity.amount ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Probability</p>
          <p className="font-semibold text-gray-900">{opportunity.probability ?? 0}%</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Expected Close</p>
          <p className="font-semibold text-gray-900">{formatDate(opportunity.expectedCloseDate)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Projected Revenue</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(((opportunity.amount ?? 0) * (opportunity.probability ?? 0)) / 100)}
          </p>
        </div>
      </div>
    </div>
  );
}

function stageVariant(stage: string) {
  switch (stage) {
    case 'won':
    case 'WON':
      return 'default';
    case 'lost':
    case 'LOST':
      return 'destructive';
    case 'negotiation':
    case 'NEGOTIATION':
      return 'secondary';
    case 'proposal':
    case 'PROPOSAL':
      return 'outline';
    case 'qualification':
    case 'QUALIFICATION':
      return 'outline';
    default:
      return 'secondary';
  }
}

function OrderRow({ order }: { order: SalesOrder }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
      <div>
        <p className="font-semibold text-gray-900">{order.orderNumber}</p>
        <p className="text-xs text-gray-500">
          {order.customer?.name ?? 'Walk-in customer'} · {formatDate(order.createdAt)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total ?? 0)}</p>
        <Badge variant="secondary">{order.status}</Badge>
      </div>
    </div>
  );
}

function QuoteRow({ quotation }: { quotation: Quotation }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
      <div>
        <p className="font-semibold text-gray-900">{quotation.quoteNumber}</p>
        <p className="text-xs text-gray-500">
          {quotation.customer?.name ?? 'Walk-in customer'} · Valid until {formatDate(quotation.validUntil)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">{formatCurrency(quotation.total ?? 0)}</p>
        <Badge variant={quoteStatusVariant(quotation.status)}>
          <div className="flex items-center gap-1">
            <CalendarCheck className="h-3.5 w-3.5" />
            {quotation.status}
          </div>
        </Badge>
      </div>
    </div>
  );
}

function quoteStatusVariant(status: string) {
  switch (status) {
    case 'ACCEPTED':
      return 'default';
    case 'SENT':
      return 'secondary';
    case 'REJECTED':
    case 'EXPIRED':
      return 'destructive';
    default:
      return 'outline';
  }
}

