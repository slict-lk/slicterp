'use client';

import { useState, useEffect } from 'react';
import { LeadList } from '@/components/sales/LeadList';
import { LeadForm } from '@/components/sales/LeadForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  status: 'NEW' | 'QUALIFIED' | 'PROPOSITION' | 'WON' | 'LOST';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  expectedRevenue?: number;
  probability?: number;
  createdAt: Date;
}

interface CrmStage {
  id: string;
  pipelineId: string;
  name: string;
  sequence: number;
  probabilityPercent?: number;
  requiresApproval?: boolean;
  editRestricted?: boolean;
  isClosed?: boolean;
}

interface CrmPipeline {
  id: string;
  name: string;
  isDefault?: boolean;
  requireStageApproval?: boolean;
  allowStageSkip?: boolean;
  allowBackwardMove?: boolean;
  stages?: CrmStage[];
}

interface CrmLeadV2 {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  pipelineId?: string | null;
  stageId?: string | null;
  status?: string;
  priority?: string;
  expectedRevenue?: number | null;
  probabilityPercent?: number | null;
  nextActionAt?: string | null;
  enteredStageAt?: string | null;
  metadata?: any;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [crmPipelines, setCrmPipelines] = useState<CrmPipeline[]>([]);
  const [crmLeads, setCrmLeads] = useState<CrmLeadV2[]>([]);
  const [crmLoading, setCrmLoading] = useState(true);
  const [crmBusyId, setCrmBusyId] = useState<string | null>(null);
  const [crmFilter, setCrmFilter] = useState<'ALL' | 'OPEN' | 'APPROVAL' | 'RESTRICTED'>('ALL');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
    loadCrmPipelines();
    loadCrmLeads();
  }, []);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => setActionNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  const loadLeads = async () => {
    try {
      const response = await fetch('/api/sales/leads');
      if (response.ok) {
        const payload = await response.json();
        // Handle both standard hardening { data: ... } and our specific items/metadata pattern
        const items = payload.items || payload.data || (Array.isArray(payload) ? payload : []);
        setLeads(items);
      }
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCrmPipelines = async () => {
    try {
      const response = await fetch('/api/crm/pipelines');
      if (response.ok) {
        const payload = await response.json();
        const items = payload.data || (Array.isArray(payload) ? payload : []);
        setCrmPipelines(items);
      }
    } catch (error) {
      console.error('Failed to load CRM pipelines:', error);
    }
  };

  const loadCrmLeads = async () => {
    try {
      setCrmLoading(true);
      const response = await fetch('/api/crm/leads');
      if (response.ok) {
        const payload = await response.json();
        const items = payload.data || payload.items || (Array.isArray(payload) ? payload : []);
        setCrmLeads(items);
      }
    } catch (error) {
      console.error('Failed to load CRM leads:', error);
    } finally {
      setCrmLoading(false);
    }
  };

  const handleCreateLead = async (data: any) => {
    try {
      const response = await fetch('/api/sales/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadLeads();
        setViewMode('list');
        setActionNotice('Lead created');
      } else {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to create lead');
      }
    } catch (error: any) {
      console.error('Error creating lead:', error);
      setActionNotice(error?.message || 'Failed to create lead');
    }
  };

  const handleUpdateLead = async (data: any) => {
    if (!selectedLead) return;

    try {
      const response = await fetch(`/api/sales/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await loadLeads();
        setViewMode('list');
        setSelectedLead(null);
        setActionNotice('Lead updated');
      } else {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to update lead');
      }
    } catch (error: any) {
      console.error('Error updating lead:', error);
      setActionNotice(error?.message || 'Failed to update lead');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      const response = await fetch(`/api/sales/leads/${leadId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadLeads();
        setActionNotice('Lead deleted');
      } else {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to delete lead');
      }
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      setActionNotice(error?.message || 'Failed to delete lead');
    }
  };

  const pipelineMap = new Map(crmPipelines.map((pipeline) => [pipeline.id, pipeline]));
  const stageMap = new Map(
    crmPipelines.flatMap((pipeline) => (pipeline.stages || []).map((stage) => [stage.id, stage] as const))
  );

  const filteredCrmLeads = crmLeads.filter((lead) => {
    const stage = lead.stageId ? stageMap.get(lead.stageId) : undefined;
    const pipeline = lead.pipelineId ? pipelineMap.get(lead.pipelineId) : undefined;
    if (crmFilter === 'ALL') return true;
    if (crmFilter === 'OPEN') return !stage?.isClosed;
    if (crmFilter === 'APPROVAL') return !!pipeline?.requireStageApproval || !!stage?.requiresApproval;
    if (crmFilter === 'RESTRICTED') return !!stage?.editRestricted;
    return true;
  });

  const handleCrmLeadStageMove = async (
    lead: CrmLeadV2,
    options?: { backward?: boolean; approvalGranted?: boolean }
  ) => {
    try {
      if (!lead.pipelineId || !lead.stageId) {
        setActionNotice('CRM lead has no pipeline/stage assigned');
        return;
      }
      const pipeline = pipelineMap.get(lead.pipelineId);
      const currentStage = stageMap.get(lead.stageId);
      if (!pipeline || !currentStage) {
        setActionNotice('CRM lead stage metadata not found');
        return;
      }
      const stages = [...(pipeline.stages || [])].sort((a, b) => a.sequence - b.sequence);
      const idx = stages.findIndex((stage) => stage.id === currentStage.id);
      const targetStage = options?.backward ? stages[idx - 1] : stages[idx + 1];
      if (!targetStage) {
        setActionNotice(options?.backward ? 'No previous stage' : 'No next stage');
        return;
      }

      setCrmBusyId(lead.id);
      const response = await fetch(`/api/crm/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId: lead.pipelineId,
          stageId: targetStage.id,
          probabilityPercent: targetStage.probabilityPercent ?? lead.probabilityPercent ?? 0,
          stageApprovalGranted: !!options?.approvalGranted,
          stageChangeReason: options?.approvalGranted
            ? 'Approved via CRM governance panel'
            : 'Moved via CRM governance panel',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to move CRM lead stage');
      }

      await loadCrmLeads();
      setActionNotice(
        `CRM lead "${lead.name}" moved to ${targetStage.name}${options?.approvalGranted ? ' (approved)' : ''}`
      );
    } catch (error: any) {
      console.error('Error moving CRM lead stage:', error);
      setActionNotice(error?.message || 'Failed to move CRM lead');
    } finally {
      setCrmBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading leads...</div>
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
                  Canonical CRM Lead Governance (V2)
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Validate lead pipeline stage rules, approval requirements, and restricted stages from the UI.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant={crmFilter === 'ALL' ? 'default' : 'outline'} onClick={() => setCrmFilter('ALL')}>All</Button>
                <Button size="sm" variant={crmFilter === 'OPEN' ? 'default' : 'outline'} onClick={() => setCrmFilter('OPEN')}>Open</Button>
                <Button size="sm" variant={crmFilter === 'APPROVAL' ? 'default' : 'outline'} onClick={() => setCrmFilter('APPROVAL')}>Approval Rules</Button>
                <Button size="sm" variant={crmFilter === 'RESTRICTED' ? 'default' : 'outline'} onClick={() => setCrmFilter('RESTRICTED')}>Edit Restricted</Button>
                <Button size="sm" variant="outline" onClick={() => { loadCrmPipelines(); loadCrmLeads(); }} disabled={crmLoading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${crmLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <LeadKpi tone="slate" label="CRM Leads" value={String(crmLeads.length)} hint="Canonical records" />
                <LeadKpi tone="blue" label="Pipelines" value={String(crmPipelines.length)} hint="Configured pipelines" />
                <LeadKpi
                  tone="amber"
                  label="Approval Rules"
                  value={String(
                    crmPipelines.reduce((sum, p) => sum + (p.requireStageApproval ? 1 : 0) + (p.stages || []).filter((s) => s.requiresApproval).length, 0)
                  )}
                  hint="Pipeline + stage"
                />
                <LeadKpi
                  tone="red"
                  label="Restricted Stages"
                  value={String(crmPipelines.reduce((sum, p) => sum + (p.stages || []).filter((s) => s.editRestricted).length, 0))}
                  hint="Edit restrictions"
                />
              </div>

              {crmLoading ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
                  Loading canonical CRM leads...
                </div>
              ) : filteredCrmLeads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
                  No canonical CRM leads found for this filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCrmLeads.slice(0, 12).map((lead) => {
                    const pipeline = lead.pipelineId ? pipelineMap.get(lead.pipelineId) : undefined;
                    const stage = lead.stageId ? stageMap.get(lead.stageId) : undefined;
                    const stages = [...(pipeline?.stages || [])].sort((a, b) => a.sequence - b.sequence);
                    const idx = stages.findIndex((s) => s.id === stage?.id);
                    const hasPrev = idx > 0;
                    const hasNext = idx >= 0 && idx < stages.length - 1;
                    const needsApproval = !!pipeline?.requireStageApproval || !!stage?.requiresApproval;
                    return (
                      <div key={lead.id} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-gray-900">{lead.name}</p>
                              <Badge variant="outline">{pipeline?.name || 'No Pipeline'}</Badge>
                              <Badge variant={stage?.isClosed ? 'secondary' : 'outline'}>{stage?.name || 'No Stage'}</Badge>
                              {needsApproval ? <Badge variant="secondary">Approval Rule</Badge> : null}
                              {stage?.editRestricted ? <Badge variant="destructive">Edit Restricted</Badge> : null}
                            </div>
                            <div className="text-xs text-gray-500">
                              {lead.email || 'No email'} · {lead.phone || 'No phone'} · Priority {lead.priority || 'MEDIUM'} · Status {lead.status || 'NEW'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Expected: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(lead.expectedRevenue || 0))}
                              {' '}· Probability {lead.probabilityPercent ?? 0}%
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="outline" disabled={!hasPrev || crmBusyId === lead.id} onClick={() => handleCrmLeadStageMove(lead, { backward: true })}>
                              Back
                            </Button>
                            <Button size="sm" variant="outline" disabled={!hasNext || crmBusyId === lead.id} onClick={() => handleCrmLeadStageMove(lead)}>
                              <ArrowRight className="mr-2 h-4 w-4" />
                              {crmBusyId === lead.id ? 'Working...' : 'Advance'}
                            </Button>
                            <Button size="sm" disabled={!hasNext || crmBusyId === lead.id} onClick={() => handleCrmLeadStageMove(lead, { approvalGranted: true })}>
                              {crmBusyId === lead.id ? 'Working...' : 'Advance (Approved)'}
                            </Button>
                          </div>
                        </div>
                        {needsApproval ? (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
                            Pipeline/stage approval rules are active. Normal advance may return a rule error; approved advance simulates reviewer approval.
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <LeadList
            leads={leads}
            onCreateNew={() => setViewMode('create')}
            onEdit={(lead) => {
              setSelectedLead(lead);
              setViewMode('edit');
            }}
            onDelete={handleDeleteLead}
            onView={(lead) => {
              setSelectedLead(lead);
              setViewMode('edit');
            }}
          />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-6">
            {viewMode === 'create' ? 'Create New Lead' : 'Edit Lead'}
          </h1>
          <LeadForm
            initialData={selectedLead || undefined}
            onSubmit={viewMode === 'create' ? handleCreateLead : handleUpdateLead}
            onCancel={() => setViewMode('list')}
          />
        </div>
      )}
    </div>
  );
}

function LeadKpi({
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
