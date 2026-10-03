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
import type { ModelRecord } from '@/lib/ai/control-plane-types';
import { joinList, nullableString, numberOrUndefined, parseList, readResponseError } from '@/components/ai/registry-manager-utils';

const PROVIDER_OPTIONS = [
  'OPENAI',
  'ANTHROPIC',
  'GROQ',
  'OLLAMA',
  'HUGGINGFACE',
  'COHERE',
  'GOOGLE',
  'AZURE',
  'AWS_BEDROCK',
  'CUSTOM',
];

type ModelFormState = {
  name: string;
  provider: string;
  modelId: string;
  description: string;
  capabilities: string;
  contextWindow: string;
  maxTokens: string;
  temperature: string;
  apiEndpoint: string;
  apiKey: string;
  isDefault: boolean;
  isActive: boolean;
};

const EMPTY_MODEL: ModelFormState = {
  name: '',
  provider: 'GROQ',
  modelId: '',
  description: '',
  capabilities: '',
  contextWindow: '4096',
  maxTokens: '',
  temperature: '0.7',
  apiEndpoint: '',
  apiKey: '',
  isDefault: false,
  isActive: true,
};

function toFormState(model: ModelRecord): ModelFormState {
  return {
    name: model.name,
    provider: model.provider,
    modelId: model.modelId,
    description: model.description || '',
    capabilities: joinList(model.capabilities),
    contextWindow: String(model.contextWindow),
    maxTokens: model.maxTokens ? String(model.maxTokens) : '',
    temperature: String(model.temperature),
    apiEndpoint: model.apiEndpoint || '',
    apiKey: '',
    isDefault: model.isDefault,
    isActive: model.isActive,
  };
}

function normalizeResponse(payload: unknown, current: ModelRecord[]) {
  if (Array.isArray(payload)) {
    return payload as ModelRecord[];
  }

  if (payload && typeof payload === 'object' && 'id' in payload) {
    const model = payload as ModelRecord;
    return [model, ...current.filter((item) => item.id !== model.id)];
  }

  return current;
}

export function ModelsManager({ initialModels }: { initialModels: ModelRecord[] }) {
  const router = useRouter();
    const [models, setModels] = useState(initialModels);
  const [selectedId, setSelectedId] = useState<string | null>(initialModels[0]?.id ?? null);
  const [form, setForm] = useState<ModelFormState>(initialModels[0] ? toFormState(initialModels[0]) : EMPTY_MODEL);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  useEffect(() => {
    setModels(initialModels);
  }, [initialModels]);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedId) ?? null,
    [models, selectedId]
  );

  useEffect(() => {
    setForm(selectedModel ? toFormState(selectedModel) : EMPTY_MODEL);
  }, [selectedModel]);

  const startCreate = () => {
    setSelectedId(null);
    setForm(EMPTY_MODEL);
  };

  const saveModel = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const ctxWindow = numberOrUndefined(form.contextWindow);
      const maxTok = numberOrUndefined(form.maxTokens);
      const temp = numberOrUndefined(form.temperature);
      if (form.contextWindow.trim() && ctxWindow === undefined) {
        throw new Error('Context window must be a valid number');
      }
      if (form.maxTokens.trim() && maxTok === undefined) {
        throw new Error('Max tokens must be a valid number');
      }
      if (form.temperature.trim() && temp === undefined) {
        throw new Error('Temperature must be a valid number');
      }

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        provider: form.provider,
        modelId: form.modelId.trim(),
        description: nullableString(form.description),
        capabilities: parseList(form.capabilities),
        contextWindow: ctxWindow ?? 4096,
        maxTokens: maxTok ?? null,
        temperature: temp ?? 0.7,
        apiEndpoint: nullableString(form.apiEndpoint),
        isDefault: form.isDefault,
        isActive: form.isActive,
      };

      if (!selectedId || form.apiKey.trim()) {
        payload.apiKey = nullableString(form.apiKey);
      }

      const response = await fetch(selectedId ? `/api/ai/models/${selectedId}` : '/api/ai/models', {
        method: selectedId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to save model'));
      }

      const body = await response.json();
      const nextModels = normalizeResponse(body, models);
      setModels(nextModels);
      setSelectedId(selectedId ?? nextModels[0]?.id ?? null);
      toast.success(selectedId ? 'Model updated' : 'Model created', { description: String(payload.name) });
      router.refresh();
    } catch (error: any) {
      toast.error('Save failed', {description: error.message || 'Failed to save model' });
    } finally {
      setSaving(false);
    }
  };

  const deleteModel = async () => {
    if (!selectedId || !selectedModel) {
      return;
    }

    if (!window.confirm(`Delete model "${selectedModel.name}"?`)) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/ai/models/${selectedId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to delete model'));
      }

      const nextModels = (await response.json()) as ModelRecord[];
      setModels(nextModels);
      setSelectedId(nextModels[0]?.id ?? null);
      toast.success('Model deleted', { description: selectedModel.name, });
      router.refresh();
    } catch (error: any) {
      toast.error('Delete failed', {description: error.message || 'Failed to delete model' });
    } finally {
      setDeleting(false);
    }
  };

  const setDefault = async (modelId: string) => {
    setSettingDefault(modelId);

    try {
      const response = await fetch(`/api/ai/models/${modelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_default' }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to set default model'));
      }

      const nextModels = (await response.json()) as ModelRecord[];
      setModels(nextModels);
      if (selectedId) {
        setSelectedId(selectedId);
      }
      toast.success('Default model updated', { description: nextModels.find((model) => model.isDefault)?.name || 'Default route changed', });
      router.refresh();
    } catch (error: any) {
      toast.error('Update failed', {description: error.message || 'Failed to set default model' });
    } finally {
      setSettingDefault(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <AISectionCard
        title="Model Registry"
        description="Real provider records, usage totals, and tenant-specific default routing."
        action={
          <Button type="button" variant="outline" onClick={startCreate}>
            Add Model
          </Button>
        }
      >
        {models.length === 0 ? (
          <AIEmptyState
            title="No models registered"
            description="Create the first tenant model record to bind chat, workflows, and copilots to a real provider."
            action={
              <Button type="button" onClick={startCreate}>
                Add Model
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{model.name}</p>
                      <p className="text-sm text-slate-600">{model.modelId}</p>
                    </div>
                  </TableCell>
                  <TableCell>{model.provider}</TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-700">
                      <p>{model.totalTokens.toLocaleString()} tokens</p>
                      <p>${model.totalCost.toFixed(2)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {model.isDefault ? <AIStatusBadge status="default" /> : null}
                      <AIStatusBadge status={model.isActive ? 'active' : 'disabled'} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setSelectedId(model.id)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDefault(model.id)}
                        disabled={model.isDefault || settingDefault === model.id}
                      >
                        {settingDefault === model.id ? 'Updating...' : 'Set Default'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AISectionCard>

      <AISectionCard
        title={selectedModel ? 'Edit Model' : 'Register Model'}
        description="Provider credentials remain tenant-scoped. Leave API key blank while editing to keep the stored secret unchanged."
      >
        <form className="space-y-5" onSubmit={saveModel}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="model-name">Name</Label>
              <Input
                id="model-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Groq Fast Lane"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={form.provider}
                onValueChange={(value) => setForm((current) => ({ ...current, provider: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="model-id">Model ID</Label>
              <Input
                id="model-id"
                value={form.modelId}
                onChange={(event) => setForm((current) => ({ ...current, modelId: event.target.value }))}
                placeholder="llama-3.3-70b-versatile"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-endpoint">API endpoint</Label>
              <Input
                id="model-endpoint"
                value={form.apiEndpoint}
                onChange={(event) =>
                  setForm((current) => ({ ...current, apiEndpoint: event.target.value }))
                }
                placeholder="http://localhost:11434/api/generate"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-description">Description</Label>
            <Textarea
              id="model-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className="min-h-[100px]"
              placeholder="Purpose, guardrails, or preferred workloads."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-capabilities">Capabilities</Label>
            <Textarea
              id="model-capabilities"
              value={form.capabilities}
              onChange={(event) =>
                setForm((current) => ({ ...current, capabilities: event.target.value }))
              }
              className="min-h-[90px]"
              placeholder="chat, reasoning, tool_calling"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="model-context-window">Context window</Label>
              <Input
                id="model-context-window"
                type="number"
                value={form.contextWindow}
                onChange={(event) =>
                  setForm((current) => ({ ...current, contextWindow: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-max-tokens">Max tokens</Label>
              <Input
                id="model-max-tokens"
                type="number"
                value={form.maxTokens}
                onChange={(event) =>
                  setForm((current) => ({ ...current, maxTokens: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-temperature">Temperature</Label>
              <Input
                id="model-temperature"
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={(event) =>
                  setForm((current) => ({ ...current, temperature: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-api-key">API key</Label>
            <Input
              id="model-api-key"
              type="password"
              value={form.apiKey}
              onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
              placeholder={selectedModel ? 'Leave blank to keep existing key' : 'Paste provider secret'}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Default route</p>
                <p className="text-xs text-slate-500">Use this model when no narrower tenant rule applies.</p>
              </div>
              <Switch
                checked={form.isDefault}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, isDefault: checked }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Active</p>
                <p className="text-xs text-slate-500">Allow the runtime to select this record for execution.</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : selectedModel ? 'Save Model' : 'Register Model'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm(selectedModel ? toFormState(selectedModel) : EMPTY_MODEL)}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={deleteModel}
              disabled={!selectedModel || deleting || saving}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </form>
      </AISectionCard>
    </div>
  );
}
