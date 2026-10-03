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
import type { CopilotConfig, DomainModule } from '@/lib/ai/control-plane-types';
import { joinList, parseList, readResponseError } from '@/components/ai/registry-manager-utils';

const MODULE_OPTIONS: DomainModule[] = [
  'crm',
  'accounting',
  'spareparts',
  'real-estate',
  'restaurant',
  'vehicle-export',
  'studio',
];

const RESPONSE_MODES: CopilotConfig['responseMode'][] = [
  'suggest_only',
  'draft_then_approve',
  'action_with_approval',
];

type CopilotFormState = {
  label: string;
  module: DomainModule;
  allowedIntents: string;
  dataSources: string;
  responseMode: CopilotConfig['responseMode'];
  actionPermissions: string;
  enabled: boolean;
};

const EMPTY_COPILOT: CopilotFormState = {
  label: '',
  module: 'crm',
  allowedIntents: '',
  dataSources: '',
  responseMode: 'suggest_only',
  actionPermissions: '',
  enabled: true,
};

function toFormState(copilot: CopilotConfig): CopilotFormState {
  return {
    label: copilot.label,
    module: copilot.module,
    allowedIntents: joinList(copilot.allowedIntents),
    dataSources: joinList(copilot.dataSources),
    responseMode: copilot.responseMode,
    actionPermissions: joinList(copilot.actionPermissions),
    enabled: copilot.enabled,
  };
}

export function CopilotsManager({ initialCopilots }: { initialCopilots: CopilotConfig[] }) {
  const router = useRouter();
    const [copilots, setCopilots] = useState(initialCopilots);
  const [selectedId, setSelectedId] = useState<string | null>(initialCopilots[0]?.id ?? null);
  const [form, setForm] = useState<CopilotFormState>(
    initialCopilots[0] ? toFormState(initialCopilots[0]) : EMPTY_COPILOT
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCopilots(initialCopilots);
  }, [initialCopilots]);

  const selectedCopilot = useMemo(
    () => copilots.find((copilot) => copilot.id === selectedId) ?? null,
    [copilots, selectedId]
  );

  useEffect(() => {
    setForm(selectedCopilot ? toFormState(selectedCopilot) : EMPTY_COPILOT);
  }, [selectedCopilot]);

  const startCreate = () => {
    setSelectedId(null);
    setForm(EMPTY_COPILOT);
  };

  const saveCopilot = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        label: form.label.trim(),
        module: form.module,
        allowedIntents: parseList(form.allowedIntents),
        dataSources: parseList(form.dataSources),
        responseMode: form.responseMode,
        actionPermissions: parseList(form.actionPermissions),
        enabled: form.enabled,
      };

      const response = await fetch(
        selectedId ? `/api/ai/copilots/${selectedId}` : '/api/ai/copilots',
        {
          method: selectedId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to save copilot'));
      }

      const nextCopilots = (await response.json()) as CopilotConfig[];
      setCopilots(nextCopilots);
      if (!selectedId) {
        const created = nextCopilots.find((c) => c.label === payload.label);
        setSelectedId(created?.id ?? nextCopilots[nextCopilots.length - 1]?.id ?? null);
      }
      toast.success(selectedId ? 'Copilot updated' : 'Copilot created', { description: payload.label });
      router.refresh();
    } catch (error: any) {
      toast.error('Save failed', {description: error.message || 'Failed to save copilot' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCopilot = async () => {
    if (!selectedId || !selectedCopilot) {
      return;
    }

    if (!window.confirm(`Delete copilot "${selectedCopilot.label}"?`)) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/ai/copilots/${selectedId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to delete copilot'));
      }

      const nextCopilots = (await response.json()) as CopilotConfig[];
      setCopilots(nextCopilots);
      setSelectedId(nextCopilots[0]?.id ?? null);
      toast.success('Copilot deleted', { description: selectedCopilot.label, });
      router.refresh();
    } catch (error: any) {
      toast.error('Delete failed', {description: error.message || 'Failed to delete copilot' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <AISectionCard
        title="Copilot Profiles"
        description="Module copilots define context, allowed intents, and governed action posture."
        action={
          <Button type="button" variant="outline" onClick={startCreate}>
            New Copilot
          </Button>
        }
      >
        {copilots.length === 0 ? (
          <AIEmptyState
            title="No copilots configured"
            description="Create a copilot profile for a module to start governing embedded assistant behavior."
            action={
              <Button type="button" onClick={startCreate}>
                Create Copilot
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {copilots.map((copilot) => (
                <TableRow key={copilot.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{copilot.label}</p>
                      <p className="text-sm text-slate-600">{copilot.allowedIntents.join(', ') || 'No intents configured'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{copilot.module}</TableCell>
                  <TableCell>{copilot.responseMode.split('_').join(' ')}</TableCell>
                  <TableCell>
                    <AIStatusBadge status={copilot.enabled ? 'enabled' : 'disabled'} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedId(copilot.id)}>
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
        title={selectedCopilot ? 'Edit Copilot' : 'Create Copilot'}
        description="Each copilot stays tenant-scoped and explicitly limited to declared contexts and actions."
      >
        <form className="space-y-5" onSubmit={saveCopilot}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="copilot-label">Label</Label>
              <Input
                id="copilot-label"
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                placeholder="CRM Copilot"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Module</Label>
              <Select
                value={form.module}
                onValueChange={(value) => setForm((current) => ({ ...current, module: value as DomainModule }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((moduleOption) => (
                    <SelectItem key={moduleOption} value={moduleOption}>
                      {moduleOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="copilot-intents">Allowed intents</Label>
            <Textarea
              id="copilot-intents"
              value={form.allowedIntents}
              onChange={(event) =>
                setForm((current) => ({ ...current, allowedIntents: event.target.value }))
              }
              className="min-h-[90px]"
              placeholder="summarize_account, draft_outreach, next_best_action"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="copilot-data-sources">Data sources</Label>
            <Textarea
              id="copilot-data-sources"
              value={form.dataSources}
              onChange={(event) => setForm((current) => ({ ...current, dataSources: event.target.value }))}
              className="min-h-[90px]"
              placeholder="customers, opportunities, invoices"
            />
          </div>

          <div className="space-y-2">
            <Label>Response mode</Label>
            <Select
              value={form.responseMode}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  responseMode: value as CopilotConfig['responseMode'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select response mode" />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode.split('_').join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="copilot-actions">Action permissions</Label>
            <Textarea
              id="copilot-actions"
              value={form.actionPermissions}
              onChange={(event) =>
                setForm((current) => ({ ...current, actionPermissions: event.target.value }))
              }
              className="min-h-[90px]"
              placeholder="crm.follow_up_task, crm.email_draft"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Enabled</p>
              <p className="text-xs text-slate-500">Expose this copilot inside the selected module.</p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : selectedCopilot ? 'Save Copilot' : 'Create Copilot'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm(selectedCopilot ? toFormState(selectedCopilot) : EMPTY_COPILOT)}>
              Reset
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={deleteCopilot}
              disabled={!selectedCopilot || deleting || saving}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </form>
      </AISectionCard>
    </div>
  );
}
