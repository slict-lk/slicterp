"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AIEmptyState, AISectionCard, AIStatusBadge } from '@/components/ai/ai-primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { IntegrationConfig } from '@/lib/ai/control-plane-types';
import { readResponseError } from '@/components/ai/registry-manager-utils';

const INTEGRATION_STATUS: IntegrationConfig['status'][] = ['connected', 'attention', 'disconnected'];

type IntegrationFormState = {
  key: string;
  label: string;
  status: IntegrationConfig['status'];
  scope: string;
  retryPolicy: string;
  authMode: string;
};

const EMPTY_INTEGRATION: IntegrationFormState = {
  key: '',
  label: '',
  status: 'disconnected',
  scope: '',
  retryPolicy: '3 retries / exponential backoff',
  authMode: 'api_key',
};

function toFormState(integration: IntegrationConfig): IntegrationFormState {
  return {
    key: integration.key,
    label: integration.label,
    status: integration.status,
    scope: integration.scope,
    retryPolicy: integration.retryPolicy,
    authMode: integration.authMode,
  };
}

export function IntegrationsManager({
  initialIntegrations,
}: {
  initialIntegrations: IntegrationConfig[];
}) {
  const router = useRouter();
    const [integrations, setIntegrations] = useState(initialIntegrations);
  const [selectedId, setSelectedId] = useState<string | null>(initialIntegrations[0]?.id ?? null);
  const [form, setForm] = useState<IntegrationFormState>(
    initialIntegrations[0] ? toFormState(initialIntegrations[0]) : EMPTY_INTEGRATION
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setIntegrations(initialIntegrations);
  }, [initialIntegrations]);

  const selectedIntegration = useMemo(
    () => integrations.find((integration) => integration.id === selectedId) ?? null,
    [integrations, selectedId]
  );

  useEffect(() => {
    setForm(selectedIntegration ? toFormState(selectedIntegration) : EMPTY_INTEGRATION);
  }, [selectedIntegration]);

  const startCreate = () => {
    setSelectedId(null);
    setForm(EMPTY_INTEGRATION);
  };

  const saveIntegration = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        key: form.key.trim(),
        label: form.label.trim(),
        status: form.status,
        scope: form.scope.trim(),
        retryPolicy: form.retryPolicy.trim(),
        authMode: form.authMode.trim(),
      };

      const response = await fetch(
        selectedId ? `/api/ai/integrations/${selectedId}` : '/api/ai/integrations',
        {
          method: selectedId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to save integration'));
      }

      const nextIntegrations = (await response.json()) as IntegrationConfig[];
      setIntegrations(nextIntegrations);
      if (!selectedId) {
        const created = nextIntegrations.find((i) => i.key === payload.key);
        setSelectedId(created?.id ?? nextIntegrations[nextIntegrations.length - 1]?.id ?? null);
      }
      toast.success(selectedId ? 'Integration updated' : 'Integration created', { description: payload.label });
      router.refresh();
    } catch (error: any) {
      toast.error('Save failed', {description: error.message || 'Failed to save integration' });
    } finally {
      setSaving(false);
    }
  };

  const deleteIntegration = async () => {
    if (!selectedId || !selectedIntegration) {
      return;
    }

    if (!window.confirm(`Delete integration "${selectedIntegration.label}"?`)) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/ai/integrations/${selectedId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to delete integration'));
      }

      const nextIntegrations = (await response.json()) as IntegrationConfig[];
      setIntegrations(nextIntegrations);
      setSelectedId(nextIntegrations[0]?.id ?? null);
      toast.success('Integration deleted', { description: selectedIntegration.label, });
      router.refresh();
    } catch (error: any) {
      toast.error('Delete failed', {description: error.message || 'Failed to delete integration' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <AISectionCard
        title="Connector Registry"
        description="Tenant connector metadata for providers, webhooks, retries, and auth boundaries."
        action={
          <Button type="button" variant="outline" onClick={startCreate}>
            New Integration
          </Button>
        }
      >
        {integrations.length === 0 ? (
          <AIEmptyState
            title="No integrations configured"
            description="Create the first connector record so operators can govern provider scope and execution posture."
            action={
              <Button type="button" onClick={startCreate}>
                Create Integration
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.map((integration) => (
                <TableRow key={integration.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{integration.label}</p>
                      <p className="text-sm text-slate-600">{integration.scope}</p>
                    </div>
                  </TableCell>
                  <TableCell>{integration.key}</TableCell>
                  <TableCell>
                    <AIStatusBadge status={integration.status} />
                  </TableCell>
                  <TableCell>{integration.authMode}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedId(integration.id)}>
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
        title={selectedIntegration ? 'Edit Integration' : 'Create Integration'}
        description="Connector records are real tenant state used by AI routing and external execution policy."
      >
        <form className="space-y-5" onSubmit={saveIntegration}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="integration-label">Label</Label>
              <Input
                id="integration-label"
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                placeholder="Groq API"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="integration-key">Key</Label>
              <Input
                id="integration-key"
                value={form.key}
                onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
                placeholder="groq_primary"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="integration-scope">Scope</Label>
            <Textarea
              id="integration-scope"
              value={form.scope}
              onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value }))}
              className="min-h-[100px]"
              placeholder="chat completion, model routing, workflow callbacks"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value as IntegrationConfig['status'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {INTEGRATION_STATUS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="integration-auth">Auth mode</Label>
              <Input
                id="integration-auth"
                value={form.authMode}
                onChange={(event) => setForm((current) => ({ ...current, authMode: event.target.value }))}
                placeholder="api_key"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="integration-retry">Retry policy</Label>
            <Textarea
              id="integration-retry"
              value={form.retryPolicy}
              onChange={(event) =>
                setForm((current) => ({ ...current, retryPolicy: event.target.value }))
              }
              className="min-h-[90px]"
              placeholder="3 retries / exponential backoff"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : selectedIntegration ? 'Save Integration' : 'Create Integration'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setForm(selectedIntegration ? toFormState(selectedIntegration) : EMPTY_INTEGRATION)
              }
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={deleteIntegration}
              disabled={!selectedIntegration || deleting || saving}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </form>
      </AISectionCard>
    </div>
  );
}
