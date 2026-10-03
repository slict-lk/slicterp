"use client";

import { useEffect, useMemo, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { AIEmptyState, AIStatusBadge } from '@/components/ai/ai-primitives';
import { useAIExperience } from '@/components/ai/ai-experience-context';
import { toast } from 'sonner';
import { getModuleLabel } from '@/lib/ai/ui-metadata';
import type { ApprovalItem } from '@/lib/ai/control-plane-types';

function formatSla(dueAt: string) {
  const dueMs = new Date(dueAt).getTime();
  if (Number.isNaN(dueMs)) return 'Due time unavailable';
  const deltaMs = dueMs - Date.now();
  const totalMinutes = Math.round(Math.abs(deltaMs) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const text = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return deltaMs >= 0 ? `${text} remaining` : `Overdue by ${text}`;
}

function getRecommendation(approval: ApprovalItem) {
  if (approval.riskScore >= 80) {
    return 'Recommended action: review carefully and escalate if the business impact looks unclear.';
  }
  if (approval.riskScore >= 50) {
    return 'Recommended action: approve only if the requested outcome and linked records look correct.';
  }
  return 'Recommended action: approve if the request matches the expected business outcome.';
}

export function ApprovalQueue({ approvals }: { approvals: ApprovalItem[] }) {
  const router = useRouter();
    const { canUseAdvanced } = useAIExperience();
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const validIds = new Set(approvals.map((approval) => approval.id));
    setSelectedIds((current) => current.filter((id) => validIds.has(id)));
  }, [approvals]);

  const selectedCount = selectedIds.length;
  const allSelected = approvals.length > 0 && selectedCount === approvals.length;

  const sortedApprovals = useMemo(
    () => [...approvals].sort((a, b) => b.riskScore - a.riskScore || new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()),
    [approvals]
  );

  const takeAction = async (approvalId: string, decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'ESCALATED') => {
    setWorkingId(approvalId);

    try {
      const response = await fetch(`/api/ai/inbox/${approvalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: notes[approvalId] || '' }),
      });

      if (!response.ok) {
        throw new Error('Failed to update approval');
      }

      setSelectedIds((current) => current.filter((id) => id !== approvalId));
      startTransition(() => router.refresh());
      toast.success(`Decision recorded`, { description: decision.replaceAll('_', ' ').toLowerCase() });
    } catch (error: any) {
      toast.error('Approval failed', {description: error.message || 'Failed to update approval' });
    } finally {
      setWorkingId(null);
    }
  };

  const bulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setWorkingId('bulk');

    try {
      const results = await Promise.allSettled(
        selectedIds.map((approvalId) =>
          fetch(`/api/ai/inbox/${approvalId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision: 'APPROVED', note: notes[approvalId] || '' }),
          }).then((response) => {
            if (!response.ok) throw new Error(`Failed to approve ${approvalId}`);
            return approvalId;
          })
        )
      );

      const succeeded = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      setSelectedIds([]);
      startTransition(() => router.refresh());
      if (failed > 0) {
        toast.error('Bulk approve completed', { description: `${succeeded} approved, ${failed} failed.` });
      } else {
        toast.success('Bulk approve completed', { description: `${succeeded} item(s) approved.` });
      }
    } catch (error: any) {
      toast.error('Bulk approve failed', {description: error.message || 'Failed to bulk approve items' });
    } finally {
      setWorkingId(null);
    }
  };

  const toggleSelected = (approvalId: string, checked: boolean) => {
    setSelectedIds((current) => (checked ? [...new Set([...current, approvalId])] : current.filter((id) => id !== approvalId)));
  };

  return (
    <div className="space-y-4">
      {approvals.length === 0 ? (
        <AIEmptyState
          title="No approvals pending"
          description="Approval-gated actions will appear here when a policy decides a person should review them first."
        />
      ) : null}

      {approvals.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Decision toolbar</p>
            <p className="text-sm text-slate-600">Use bulk approval only for low-risk items that have already been reviewed.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox checked={allSelected} onCheckedChange={(checked) => setSelectedIds(checked ? approvals.map((approval) => approval.id) : [])} />
              <span>{selectedCount} selected</span>
            </div>
            <Button type="button" variant="outline" onClick={bulkApprove} disabled={selectedCount === 0 || workingId === 'bulk'}>
              {workingId === 'bulk' ? 'Approving...' : 'Bulk Approve'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {sortedApprovals.map((approval) => {
          const overdue = new Date(approval.dueAt).getTime() < Date.now();
          return (
            <div key={approval.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedIds.includes(approval.id)}
                      onCheckedChange={(checked) => toggleSelected(approval.id, checked === true)}
                    />
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{approval.title}</p>
                      <p className="text-sm text-slate-600">{approval.summary}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What is being requested</p>
                      <p className="mt-2 text-sm text-slate-900">{approval.title}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Why it needs approval</p>
                      <p className="mt-2 text-sm text-slate-900">Risk score {approval.riskScore} in {getModuleLabel(approval.module)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What happens if approved</p>
                      <p className="mt-2 text-sm text-slate-900">The requested action will run and write to the linked business records.</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-900">Business impact</p>
                    <p className="mt-1 text-sm text-slate-600">{getRecommendation(approval)}</p>
                  </div>
                </div>

                <div className="min-w-[280px] space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <AIStatusBadge status={approval.status} />
                    <AIStatusBadge status={`Risk ${approval.riskScore}`} />
                    {canUseAdvanced ? <AIStatusBadge status={approval.assignedRole || approval.assignedToUserId || 'Unassigned'} /> : null}
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-slate-400" /> Due {new Date(approval.dueAt).toLocaleString()}</p>
                    <p className={overdue ? 'text-red-600' : ''}>{formatSla(approval.dueAt)}</p>
                    <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-slate-400" /> Requested by {approval.requestedBy || 'system'}</p>
                    {canUseAdvanced ? <p>Assignment: {approval.assignedRole || approval.assignedToUserId || 'Unassigned'}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor={`note-${approval.id}`} className="text-sm font-medium text-slate-900">Decision note</label>
                    <Textarea
                      id={`note-${approval.id}`}
                      value={notes[approval.id] || ''}
                      onChange={(event) => setNotes((current) => ({ ...current, [approval.id]: event.target.value }))}
                      rows={3}
                      placeholder="Add a short reason or comment"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Button type="button" onClick={() => takeAction(approval.id, 'APPROVED')} disabled={workingId === approval.id || workingId === 'bulk'}>
                      Approve
                    </Button>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button type="button" variant="outline" onClick={() => takeAction(approval.id, 'REJECTED')} disabled={workingId === approval.id || workingId === 'bulk'}>
                        Reject
                      </Button>
                      <Button type="button" variant="outline" onClick={() => takeAction(approval.id, 'CHANGES_REQUESTED')} disabled={workingId === approval.id || workingId === 'bulk'}>
                        Ask for Changes
                      </Button>
                      <Button type="button" variant="outline" onClick={() => takeAction(approval.id, 'ESCALATED')} disabled={workingId === approval.id || workingId === 'bulk'}>
                        Escalate
                      </Button>
                    </div>
                  </div>

                  {overdue ? (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                      <span>This item is overdue. Review it before approving additional lower-priority items.</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
