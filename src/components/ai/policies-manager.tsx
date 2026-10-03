"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AIEmptyState, AISectionCard, AIStatusBadge } from '@/components/ai/ai-primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { PolicyCategory, PolicyProfile } from '@/lib/ai/control-plane-types';
import { joinList, numberOrUndefined, parseList, readResponseError } from '@/components/ai/registry-manager-utils';

const POLICY_CATEGORIES: PolicyCategory[] = [
  'financial',
  'customer_comms',
  'inventory',
  'regulatory',
  'data_export',
];

type PolicyFormState = {
  name: string;
  description: string;
  category: PolicyCategory;
  approvalThreshold: string;
  autoApproveBelow: string;
  approverRoles: string;
  escalationRoles: string;
  approvalSlaMinutes: string;
  separationOfDuties: boolean;
  active: boolean;
};

const EMPTY_POLICY: PolicyFormState = {
  name: '',
  description: '',
  category: 'financial',
  approvalThreshold: '55',
  autoApproveBelow: '25',
  approverRoles: 'AI_ADMIN, APPROVER',
  escalationRoles: 'AI_ADMIN',
  approvalSlaMinutes: '120',
  separationOfDuties: true,
  active: true,
};

function toFormState(policy: PolicyProfile): PolicyFormState {
  return {
    name: policy.name,
    description: policy.description,
    category: policy.category,
    approvalThreshold: String(policy.approvalThreshold),
    autoApproveBelow: String(policy.autoApproveBelow),
    approverRoles: joinList(policy.approverRoles),
    escalationRoles: joinList(policy.escalationRoles),
    approvalSlaMinutes: String(policy.approvalSlaMinutes),
    separationOfDuties: policy.separationOfDuties,
    active: policy.active,
  };
}

export function PoliciesManager({ initialPolicies }: { initialPolicies: PolicyProfile[] }) {
  const router = useRouter();
    const [policies, setPolicies] = useState(initialPolicies);
  const [selectedId, setSelectedId] = useState<string | null>(initialPolicies[0]?.id ?? null);
  const [form, setForm] = useState<PolicyFormState>(
    initialPolicies[0] ? toFormState(initialPolicies[0]) : EMPTY_POLICY
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPolicies(initialPolicies);
  }, [initialPolicies]);

  useEffect(() => {
    if (selectedId && !initialPolicies.some((policy) => policy.id === selectedId)) {
      setSelectedId(initialPolicies[0]?.id ?? null);
      return;
    }

    if (!selectedId && initialPolicies.length === 0) {
      setForm(EMPTY_POLICY);
    }
  }, [initialPolicies, selectedId]);

  const selectedPolicy = useMemo(
    () => policies.find((policy) => policy.id === selectedId) ?? null,
    [policies, selectedId]
  );

  useEffect(() => {
    setForm(selectedPolicy ? toFormState(selectedPolicy) : EMPTY_POLICY);
  }, [selectedPolicy]);

  const resetForm = () => {
    if (selectedPolicy) {
      setForm(toFormState(selectedPolicy));
      return;
    }

    setForm(EMPTY_POLICY);
  };

  const startCreate = () => {
    setSelectedId(null);
    setForm(EMPTY_POLICY);
  };

  const savePolicy = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        approvalThreshold: numberOrUndefined(form.approvalThreshold) ?? 55,
        autoApproveBelow: numberOrUndefined(form.autoApproveBelow) ?? 25,
        approverRoles: parseList(form.approverRoles),
        escalationRoles: parseList(form.escalationRoles),
        approvalSlaMinutes: numberOrUndefined(form.approvalSlaMinutes) ?? 120,
        separationOfDuties: form.separationOfDuties,
        active: form.active,
      };

      const response = await fetch(
        selectedId ? `/api/ai/policies/${selectedId}` : '/api/ai/policies',
        {
          method: selectedId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to save policy'));
      }

      const nextPolicies = (await response.json()) as PolicyProfile[];
      const nextSelectedId = selectedId ?? nextPolicies[0]?.id ?? null;
      setPolicies(nextPolicies);
      setSelectedId(nextSelectedId);
      toast.success(selectedId ? 'Policy updated' : 'Policy created', { description: payload.name });
      router.refresh();
    } catch (error: any) {
      toast.error('Save failed', {description: error.message || 'Failed to save policy' });
    } finally {
      setSaving(false);
    }
  };

  const deletePolicy = async () => {
    if (!selectedId || !selectedPolicy) {
      return;
    }

    if (!window.confirm(`Delete policy "${selectedPolicy.name}"?`)) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/ai/policies/${selectedId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to delete policy'));
      }

      const nextPolicies = (await response.json()) as PolicyProfile[];
      setPolicies(nextPolicies);
      setSelectedId(nextPolicies[0]?.id ?? null);
      toast.success('Policy deleted', { description: selectedPolicy.name, });
      router.refresh();
    } catch (error: any) {
      toast.error('Delete failed', {description: error.message || 'Failed to delete policy' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <AISectionCard
        title="Policy Profiles"
        description="Risk scoring, approval thresholds, and role separation for governed execution."
        action={
          <Button type="button" variant="outline" onClick={startCreate}>
            New Policy
          </Button>
        }
      >
        {policies.length === 0 ? (
          <AIEmptyState
            title="No policy profiles configured"
            description="Create the first approval policy so workflows and model actions can be routed through a real governance profile."
            action={
              <Button type="button" onClick={startCreate}>
                Create Policy
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id} data-state={policy.id === selectedId ? 'selected' : undefined}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{policy.name}</p>
                      <p className="text-sm text-slate-600">{policy.description}</p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{policy.category.replace('_', ' ')}</TableCell>
                  <TableCell>{policy.approvalThreshold}</TableCell>
                  <TableCell>
                    <AIStatusBadge status={policy.active ? 'active' : 'disabled'} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedId(policy.id)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AISectionCard>

      <AISectionCard
        title={selectedPolicy ? 'Edit Policy' : 'Create Policy'}
        description="Profiles are tenant-scoped and used by workflows, approvals, and model action adapters."
      >
        <form className="space-y-5" onSubmit={savePolicy}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="policy-name">Name</Label>
              <Input
                id="policy-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Financial Control"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, category: value as PolicyCategory }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy-description">Description</Label>
            <Textarea
              id="policy-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-[110px]"
              placeholder="Explain when this profile should block, auto-approve, or route to human approval."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="approval-threshold">Approval threshold</Label>
              <Input
                id="approval-threshold"
                type="number"
                value={form.approvalThreshold}
                onChange={(event) =>
                  setForm((current) => ({ ...current, approvalThreshold: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auto-approve-below">Auto-approve below</Label>
              <Input
                id="auto-approve-below"
                type="number"
                value={form.autoApproveBelow}
                onChange={(event) =>
                  setForm((current) => ({ ...current, autoApproveBelow: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Separation of duties</p>
                <p className="text-xs text-slate-500">Prevent requestor and approver overlap.</p>
              </div>
              <Switch
                checked={form.separationOfDuties}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, separationOfDuties: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Active</p>
                <p className="text-xs text-slate-500">Allow new runs to resolve against this policy.</p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, active: checked }))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="approver-roles">Approver roles</Label>
              <Textarea
                id="approver-roles"
                value={form.approverRoles}
                onChange={(event) =>
                  setForm((current) => ({ ...current, approverRoles: event.target.value }))
                }
                className="min-h-[90px]"
                placeholder="AI_ADMIN, APPROVER"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="escalation-roles">Escalation roles</Label>
              <Textarea
                id="escalation-roles"
                value={form.escalationRoles}
                onChange={(event) =>
                  setForm((current) => ({ ...current, escalationRoles: event.target.value }))
                }
                className="min-h-[90px]"
                placeholder="AI_ADMIN"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="approval-sla-minutes">Approval SLA minutes</Label>
            <Input
              id="approval-sla-minutes"
              type="number"
              value={form.approvalSlaMinutes}
              onChange={(event) =>
                setForm((current) => ({ ...current, approvalSlaMinutes: event.target.value }))
              }
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : selectedPolicy ? 'Save Policy' : 'Create Policy'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
              Reset
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={deletePolicy}
              disabled={!selectedPolicy || deleting || saving}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </form>
      </AISectionCard>
    </div>
  );
}
