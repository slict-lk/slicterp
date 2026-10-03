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
import type { ModelRecord, PromptRecord } from '@/lib/ai/control-plane-types';
import { nullableString, parseList, readResponseError } from '@/components/ai/registry-manager-utils';

const PROMPT_CATEGORIES = [
  'GENERAL',
  'SALES',
  'CUSTOMER_SERVICE',
  'ANALYTICS',
  'REPORTING',
  'CODE_GENERATION',
  'DATA_EXTRACTION',
  'SUMMARIZATION',
  'TRANSLATION',
  'CLASSIFICATION',
  'SENTIMENT_ANALYSIS',
  'CUSTOM',
];

const NO_MODEL_VALUE = '__none__';

type PromptFormState = {
  name: string;
  description: string;
  category: string;
  template: string;
  variables: string;
  modelId: string;
  isActive: boolean;
};

const EMPTY_PROMPT: PromptFormState = {
  name: '',
  description: '',
  category: 'GENERAL',
  template: '',
  variables: '',
  modelId: NO_MODEL_VALUE,
  isActive: true,
};

function toFormState(prompt: PromptRecord): PromptFormState {
  return {
    name: prompt.name,
    description: prompt.description || '',
    category: prompt.category,
    template: prompt.template,
    variables: prompt.variables.join(', '),
    modelId: prompt.modelId || NO_MODEL_VALUE,
    isActive: prompt.isActive,
  };
}

function normalizeResponse(payload: unknown, current: PromptRecord[]) {
  if (Array.isArray(payload)) {
    return payload as PromptRecord[];
  }

  if (payload && typeof payload === 'object' && 'id' in payload) {
    const prompt = payload as PromptRecord;
    return [prompt, ...current.filter((item) => item.id !== prompt.id)];
  }

  return current;
}

export function PromptsManager({
  initialPrompts,
  models,
}: {
  initialPrompts: PromptRecord[];
  models: ModelRecord[];
}) {
  const router = useRouter();
    const [prompts, setPrompts] = useState(initialPrompts);
  const [selectedId, setSelectedId] = useState<string | null>(initialPrompts[0]?.id ?? null);
  const [form, setForm] = useState<PromptFormState>(
    initialPrompts[0] ? toFormState(initialPrompts[0]) : EMPTY_PROMPT
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPrompts(initialPrompts);
  }, [initialPrompts]);

  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === selectedId) ?? null,
    [prompts, selectedId]
  );

  useEffect(() => {
    setForm(selectedPrompt ? toFormState(selectedPrompt) : EMPTY_PROMPT);
  }, [selectedPrompt]);

  const startCreate = () => {
    setSelectedId(null);
    setForm(EMPTY_PROMPT);
  };

  const savePrompt = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: nullableString(form.description),
        category: form.category,
        template: form.template,
        variables: parseList(form.variables),
        modelId: form.modelId === NO_MODEL_VALUE ? null : form.modelId,
        isActive: form.isActive,
      };

      const response = await fetch(selectedId ? `/api/ai/prompts/${selectedId}` : '/api/ai/prompts', {
        method: selectedId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to save prompt'));
      }

      const body = await response.json();
      const nextPrompts = normalizeResponse(body, prompts);
      setPrompts(nextPrompts);
      setSelectedId(selectedId ?? nextPrompts[0]?.id ?? null);
      toast.success(selectedId ? 'Prompt updated' : 'Prompt created', { description: payload.name });
      router.refresh();
    } catch (error: any) {
      toast.error('Save failed', {description: error.message || 'Failed to save prompt' });
    } finally {
      setSaving(false);
    }
  };

  const deletePrompt = async () => {
    if (!selectedId || !selectedPrompt) {
      return;
    }

    if (!window.confirm(`Delete prompt "${selectedPrompt.name}"?`)) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/ai/prompts/${selectedId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to delete prompt'));
      }

      const nextPrompts = (await response.json()) as PromptRecord[];
      setPrompts(nextPrompts);
      setSelectedId(nextPrompts[0]?.id ?? null);
      toast.success('Prompt deleted', { description: selectedPrompt.name, });
      router.refresh();
    } catch (error: any) {
      toast.error('Delete failed', {description: error.message || 'Failed to delete prompt' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <AISectionCard
        title="Prompt Registry"
        description="Prompt templates, category routing, model binding, and activation state."
        action={
          <Button type="button" variant="outline" onClick={startCreate}>
            New Prompt
          </Button>
        }
      >
        {prompts.length === 0 ? (
          <AIEmptyState
            title="No prompts registered"
            description="Create prompt templates here to power copilots, agents, and routed AI execution without relying on inline hardcoded prompts."
            action={
              <Button type="button" onClick={startCreate}>
                Create Prompt
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{prompt.name}</p>
                      <p className="text-sm text-slate-600">{prompt.variables.join(', ') || 'No variables declared'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{prompt.category}</TableCell>
                  <TableCell>{prompt.usageCount}</TableCell>
                  <TableCell>
                    <AIStatusBadge status={prompt.isActive ? 'active' : 'disabled'} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedId(prompt.id)}>
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
        title={selectedPrompt ? 'Edit Prompt' : 'Create Prompt'}
        description="Prompt content is persisted per tenant and can be routed to a specific registered model."
      >
        <form className="space-y-5" onSubmit={savePrompt}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prompt-name">Name</Label>
              <Input
                id="prompt-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Deal Risk Summary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PROMPT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt-description">Description</Label>
            <Textarea
              id="prompt-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className="min-h-[90px]"
              placeholder="Describe the purpose and expected use of this prompt."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt-template">Template</Label>
            <Textarea
              id="prompt-template"
              value={form.template}
              onChange={(event) => setForm((current) => ({ ...current, template: event.target.value }))}
              className="min-h-[180px] font-mono"
              placeholder="Summarize the deal risk using {{account_name}}, {{open_amount}}, and {{next_activity}}."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt-variables">Variables</Label>
            <Textarea
              id="prompt-variables"
              value={form.variables}
              onChange={(event) =>
                setForm((current) => ({ ...current, variables: event.target.value }))
              }
              className="min-h-[90px]"
              placeholder="account_name, open_amount, next_activity"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Bound model</Label>
              <Select
                value={form.modelId}
                onValueChange={(value) => setForm((current) => ({ ...current, modelId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MODEL_VALUE}>No explicit model</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Active</p>
                <p className="text-xs text-slate-500">Allow the runtime to pick this prompt.</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : selectedPrompt ? 'Save Prompt' : 'Create Prompt'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm(selectedPrompt ? toFormState(selectedPrompt) : EMPTY_PROMPT)}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={deletePrompt}
              disabled={!selectedPrompt || deleting || saving}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </form>
      </AISectionCard>
    </div>
  );
}
