'use client';

import { useState, useEffect } from 'react';
import { OpportunityList } from '@/components/sales/OpportunityList';
import { OpportunityForm } from '@/components/sales/OpportunityForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';

interface Opportunity {
  id: string;
  name: string;
  customerId: string;
  customer?: {
    id: string;
    name: string;
  };
  leadId?: string;
  stage: string;
  probability: number;
  expectedRevenue: number;
  expectedCloseDate: Date | null;
  description?: string;
  notes?: string;
  createdAt: Date;
}

interface Customer {
  id: string;
  name: string;
}

interface Lead {
  id: string;
  title?: string;
  name?: string;
}

interface CrmStage {
  id: string;
  pipelineId: string;
  name: string;
  code?: string | null;
  sequence: number;
  probabilityPercent?: number;
  requiresApproval?: boolean;
  editRestricted?: boolean;
  isClosed?: boolean;
  isWon?: boolean;
}

interface CrmPipeline {
  id: string;
  name: string;
  code?: string | null;
  isDefault?: boolean;
  allowStageSkip?: boolean;
  allowBackwardMove?: boolean;
  requireStageApproval?: boolean;
  stages?: CrmStage[];
}

interface CrmOpportunityV2 {
  id: string;
  name: string;
  pipelineId?: string | null;
  stageId?: string | null;
  customerAccountId?: string | null;
  amount?: number;
  probabilityPercent?: number;
  expectedCloseDate?: string | null;
  status?: string;
  priority?: string;
  approvalRequired?: boolean;
  metadata?: any;
}

type ViewMode = 'list' | 'create' | 'edit';

function toFormStage(stage?: string | null) {
  const s = String(stage || '').toUpperCase();
  if (s === 'WON') return 'CLOSED_WON' as const;
  if (s === 'LOST') return 'CLOSED_LOST' as const;
  if (s === 'PROPOSITION') return 'PROPOSAL' as const;
  if (s === 'QUALIFIED') return 'QUALIFICATION' as const;
  if (s === 'NEW' || s === 'PROSPECTING') return 'QUALIFICATION' as const;
  if (['QUALIFICATION', 'NEEDS_ANALYSIS', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'].includes(s)) {
    return s as 'QUALIFICATION' | 'NEEDS_ANALYSIS' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  }
  return 'QUALIFICATION' as const;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [crmPipelines, setCrmPipelines] = useState<CrmPipeline[]>([]);
  const [crmOpportunities, setCrmOpportunities] = useState<CrmOpportunityV2[]>([]);
  const [crmLoading, setCrmLoading] = useState(true);
  const [crmBusyId, setCrmBusyId] = useState<string | null>(null);
  const [crmFilter, setCrmFilter] = useState<'ALL' | 'RESTRICTED' | 'APPROVAL' | 'OPEN'>('ALL');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    loadOpportunities();
    loadCrmPipelines();
    loadCrmOpportunities();
    loadCustomers();
    loadLeads();
  }, []);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => setActionNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  const loadOpportunities = async () => {
    try {
      const response = await fetch('/api/sales/opportunities');
      if (response.ok) {
        const data = await response.json();
        setOpportunities((Array.isArray(data) ? data : []).map((o: any) => ({
          ...o,
          expectedCloseDate: o.expectedCloseDate ? new Date(o.expectedCloseDate) : null,
        })));
      }
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/sales/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data) ? data : (data.data || data.items || []));
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadLeads = async () => {
    try {
      const response = await fetch('/api/sales/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads((Array.isArray(data) ? data : []).map((lead: any) => ({
          ...lead,
          title: lead.title || lead.name,
        })));
      }
    } catch (error) {
      console.error('Failed to load leads:', error);
    }
  };

  const handleCreateOpportunity = async (data: any) => {
    try {
      const response = await fetch('/api/sales/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadOpportunities();
        setViewMode('list');
        setActionNotice('Opportunity created');
      } else {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to create opportunity');
      }
    } catch (error: any) {
      console.error('Error creating opportunity:', error);
      setActionNotice(error?.message || 'Failed to create opportunity');
    }
  };

  const handleUpdateOpportunity = async (data: any) => {
    if (!selectedOpportunity) return;

    try {
      const response = await fetch(`/api/sales/opportunities/${selectedOpportunity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadOpportunities();
        setViewMode('list');
        setSelectedOpportunity(null);
        setActionNotice('Opportunity updated');
      } else {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to update opportunity');
      }
    } catch (error: any) {
      console.error('Error updating opportunity:', error);
      setActionNotice(error?.message || 'Failed to update opportunity');
    }
  };

  const handleDeleteOpportunity = async (opportunityId: string) => {
    try {
      const response = await fetch(`/api/sales/opportunities/${opportunityId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadOpportunities();
        setActionNotice('Opportunity deleted');
      } else {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to delete opportunity');
      }
    } catch (error: any) {
      console.error('Error deleting opportunity:', error);
      setActionNotice(error?.message || 'Failed to delete opportunity');
    }
  };

  const handleStageChange = async (opportunity: Opportunity, nextStage: string) => {
    const probabilityByStage: Record<string, number> = {
      PROSPECTING: 10,
      QUALIFICATION: 20,
      NEEDS_ANALYSIS: 35,
      PROPOSAL: 55,
      NEGOTIATION: 75,
      CLOSED_WON: 100,
      CLOSED_LOST: 0,
    };

    try {
      const response = await fetch(`/api/sales/opportunities/${opportunity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: nextStage,
          probability: probabilityByStage[nextStage] ?? opportunity.probability,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to update stage');
      }

      await loadOpportunities();
      setActionNotice(`Opportunity moved to ${nextStage}`);
    } catch (error: any) {
      console.error('Error changing opportunity stage:', error);
      setActionNotice(error?.message || 'Failed to change stage');
    }
  };

  const pipelineMap = new Map(crmPipelines.map((pipeline) => [pipeline.id, pipeline]));
  const stageMap = new Map(
    crmPipelines.flatMap((pipeline) => (pipeline.stages || []).map((stage) => [stage.id, stage] as const))
  );

  const filteredCrmOpportunities = crmOpportunities.filter((item) => {
    const stage = item.stageId ? stageMap.get(item.stageId) : undefined;
    const pipeline = item.pipelineId ? pipelineMap.get(item.pipelineId) : undefined;
    if (crmFilter === 'ALL') return true;
    if (crmFilter === 'OPEN') return !stage?.isClosed;
    if (crmFilter === 'RESTRICTED') return !!stage?.editRestricted;
    if (crmFilter === 'APPROVAL') return !!pipeline?.requireStageApproval || !!stage?.requiresApproval;
    return true;
  });

  const handleCrmAdvance = async (
    item: CrmOpportunityV2,
    options?: { approvalGranted?: boolean; backward?: boolean }
  ) => {
    try {
      if (!item.pipelineId || !item.stageId) {
        setActionNotice('CRM opportunity has no pipeline/stage assigned');
        return;
      }
      const pipeline = pipelineMap.get(item.pipelineId);
      const currentStage = stageMap.get(item.stageId);
      if (!pipeline || !currentStage) {
        setActionNotice('Pipeline stage metadata not found');
        return;
      }
      const stages = [...(pipeline.stages || [])].sort((a, b) => a.sequence - b.sequence);
      const currentIndex = stages.findIndex((s) => s.id === currentStage.id);
      if (currentIndex < 0) {
        setActionNotice('Current stage not found in pipeline');
        return;
      }
      const targetStage = options?.backward ? stages[currentIndex - 1] : stages[currentIndex + 1];
      if (!targetStage) {
        setActionNotice(options?.backward ? 'No previous stage' : 'No next stage');
        return;
      }

      setCrmBusyId(item.id);
      const response = await fetch(`/api/crm/opportunities/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId: item.pipelineId,
          stageId: targetStage.id,
          probabilityPercent: targetStage.probabilityPercent ?? item.probabilityPercent ?? 0,
          stageApprovalGranted: !!options?.approvalGranted,
          stageChangeReason: options?.approvalGranted
            ? 'Approved via CRM governance panel'
            : 'Moved via CRM governance panel',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to move CRM stage');
      }

      await loadCrmOpportunities();
      setActionNotice(
        `CRM opportunity "${item.name}" moved to ${targetStage.name}${
          options?.approvalGranted ? ' (approved)' : ''
        }`
      );
    } catch (error: any) {
      console.error('Error advancing CRM opportunity:', error);
      setActionNotice(error?.message || 'Failed to move CRM opportunity');
    } finally {
      setCrmBusyId(null);
    }
  };

  const loadCrmPipelines = async () => {
    try {
      const response = await fetch('/api/crm/pipelines');
      if (response.ok) {
        const data = await response.json();
        setCrmPipelines(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load CRM pipelines:', error);
    }
  };

  const loadCrmOpportunities = async () => {
    try {
      setCrmLoading(true);
      const response = await fetch('/api/crm/opportunities');
      if (response.ok) {
        const data = await response.json();
        setCrmOpportunities(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load CRM opportunities:', error);
    } finally {
      setCrmLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading opportunities...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {actionNotice ? (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {actionNotice}
        </div>
      ) : null}
      {viewMode === 'list' ? (
        <div className="space-y-6">
          <Card className="border-gray-200">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  Canonical CRM Governance (V2)
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Test pipeline rules, stage approvals, and edit restrictions using canonical CRM opportunities.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant={crmFilter === 'ALL' ? 'default' : 'outline'} onClick={() => setCrmFilter('ALL')}>All</Button>
                <Button size="sm" variant={crmFilter === 'OPEN' ? 'default' : 'outline'} onClick={() => setCrmFilter('OPEN')}>Open</Button>
                <Button size="sm" variant={crmFilter === 'APPROVAL' ? 'default' : 'outline'} onClick={() => setCrmFilter('APPROVAL')}>Approval Rules</Button>
                <Button size="sm" variant={crmFilter === 'RESTRICTED' ? 'default' : 'outline'} onClick={() => setCrmFilter('RESTRICTED')}>Edit Restricted</Button>
                <Button size="sm" variant="outline" onClick={() => { loadCrmPipelines(); loadCrmOpportunities(); }} disabled={crmLoading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${crmLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <CrmKpi
                  tone="slate"
                  label="CRM Opportunities"
                  value={String(crmOpportunities.length)}
                  hint="Canonical records"
                />
                <CrmKpi
                  tone="blue"
                  label="Pipelines"
                  value={String(crmPipelines.length)}
                  hint="Configured pipelines"
                />
                <CrmKpi
                  tone="amber"
                  label="Stage Approval Rules"
                  value={String(
                    crmPipelines.reduce(
                      (sum, p) =>
                        sum +
                        (p.requireStageApproval ? 1 : 0) +
                        (p.stages || []).filter((s) => s.requiresApproval).length,
                      0
                    )
                  )}
                  hint="Pipeline + stage rules"
                />
                <CrmKpi
                  tone="red"
                  label="Edit Restricted Stages"
                  value={String(crmPipelines.reduce((sum, p) => sum + (p.stages || []).filter((s) => s.editRestricted).length, 0))}
                  hint="Governed stages"
                />
              </div>

              {crmLoading ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
                  Loading canonical CRM opportunities...
                </div>
              ) : filteredCrmOpportunities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
                  No canonical CRM opportunities found for this filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCrmOpportunities.slice(0, 10).map((item) => {
                    const pipeline = item.pipelineId ? pipelineMap.get(item.pipelineId) : undefined;
                    const stage = item.stageId ? stageMap.get(item.stageId) : undefined;
                    const pipelineStages = [...(pipeline?.stages || [])].sort((a, b) => a.sequence - b.sequence);
                    const idx = pipelineStages.findIndex((s) => s.id === stage?.id);
                    const hasPrev = idx > 0;
                    const hasNext = idx >= 0 && idx < pipelineStages.length - 1;
                    const needsApprovalRule = !!pipeline?.requireStageApproval || !!stage?.requiresApproval;

                    return (
                      <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-gray-900">{item.name}</p>
                              <Badge variant="outline">{pipeline?.name || 'No Pipeline'}</Badge>
                              <Badge variant={stage?.isClosed ? 'secondary' : 'outline'}>{stage?.name || 'No Stage'}</Badge>
                              {needsApprovalRule ? <Badge variant="secondary">Approval Rule</Badge> : null}
                              {stage?.editRestricted ? <Badge variant="destructive">Edit Restricted</Badge> : null}
                            </div>
                            <div className="text-xs text-gray-500">
                              Amount: {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.metadata?.currency || 'USD', maximumFractionDigits: 0 }).format(Number(item.amount || 0))} · Probability {item.probabilityPercent ?? 0}% · Status {item.status || 'OPEN'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Stage sequence: {stage?.sequence ?? '—'} / {pipelineStages.length || '—'} · Next action may fail if rules require approval
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!hasPrev || crmBusyId === item.id}
                              onClick={() => handleCrmAdvance(item, { backward: true })}
                            >
                              Back
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!hasNext || crmBusyId === item.id}
                              onClick={() => handleCrmAdvance(item)}
                            >
                              <ArrowRight className="mr-2 h-4 w-4" />
                              {crmBusyId === item.id ? 'Working...' : 'Advance'}
                            </Button>
                            <Button
                              size="sm"
                              disabled={!hasNext || crmBusyId === item.id}
                              onClick={() => handleCrmAdvance(item, { approvalGranted: true })}
                            >
                              {crmBusyId === item.id ? 'Working...' : 'Advance (Approved)'}
                            </Button>
                          </div>
                        </div>

                        {needsApprovalRule ? (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
                            This pipeline/stage has approval requirements. Use the approved action to simulate supervisor approval.
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <OpportunityList
            opportunities={opportunities}
            onCreateNew={() => setViewMode('create')}
            onEdit={(opportunity) => {
              setSelectedOpportunity(opportunity);
              setViewMode('edit');
            }}
            onDelete={handleDeleteOpportunity}
            onView={(opportunity) => {
              setSelectedOpportunity(opportunity);
              setViewMode('edit');
            }}
            onStageChange={handleStageChange}
          />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Opportunities
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-6">
            {viewMode === 'create' ? 'Create New Opportunity' : 'Edit Opportunity'}
          </h1>
          <OpportunityForm
            initialData={selectedOpportunity ? {
              ...selectedOpportunity,
              stage: toFormStage(selectedOpportunity.stage),
              expectedCloseDate: selectedOpportunity.expectedCloseDate
                ? new Date(selectedOpportunity.expectedCloseDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]
            } : undefined}
            customers={customers}
            leads={leads}
            onSubmit={viewMode === 'create' ? handleCreateOpportunity : handleUpdateOpportunity}
            onCancel={() => setViewMode('list')}
          />
        </div>
      )}
    </div>
  );
}

function CrmKpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'slate' | 'blue' | 'amber' | 'red';
}) {
  const tones: Record<typeof tone, string> = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
  } as const;

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-90">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="text-xs opacity-80">{hint}</p>
    </div>
  );
}
