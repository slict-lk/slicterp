"use client";

import { useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AIFormSection } from '@/components/ai/ai-primitives';

const MODULE_OPTIONS = ['crm', 'accounting', 'spareparts', 'real-estate', 'restaurant', 'vehicle-export', 'studio'];
const AGENT_TYPES = ['WORKFLOW', 'SALES', 'FINANCIAL', 'INVENTORY', 'CUSTOMER_SERVICE'];

export function AgentComposer({
  models,
}: {
  models: Array<{ id: string; name: string; provider: string; modelId: string }>;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('WORKFLOW');
  const [moduleScope, setModuleScope] = useState('crm');
  const [modelId, setModelId] = useState(models[0]?.id || 'none');
  const [allowedTools, setAllowedTools] = useState('search_customer\nsummarize_activity');
  const [escalationPolicy, setEscalationPolicy] = useState('approval_gate');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          type,
          moduleScope,
          modelId: modelId === 'none' ? null : modelId,
          escalationPolicy,
          allowedTools: allowedTools
            .split('\n')
            .map((tool) => tool.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Failed to create agent' }));
        throw new Error(body.error || 'Failed to create agent');
      }

      const agent = await response.json();
      if (!agent?.id) {
        throw new Error('Invalid agent response');
      }
      startTransition(() => {
        router.push(`/ai/agents/${agent.id}`);
        router.refresh();
      });
    } catch (submitError: any) {
      setError(submitError.message || 'Failed to create agent');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <AIFormSection
        title="Identity"
        description="Define the agent role, coverage area, and routing model."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Agent name</Label>
            <Input id="agent-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Agent type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select agent type" />
              </SelectTrigger>
              <SelectContent>
                {AGENT_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Module scope</Label>
            <Select value={moduleScope} onValueChange={setModuleScope}>
              <SelectTrigger>
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {MODULE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Model routing rule</Label>
            <Select value={modelId} onValueChange={setModelId}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No explicit model</SelectItem>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.provider === 'GOOGLE' && '🔮 '}
                    {model.provider === 'GROQ' && '⚡ '}
                    {model.provider === 'OLLAMA' && '🦙 '}
                    {model.name} ({model.provider})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {models.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">
                No active models found. Configure models in AI Settings.
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-description">Description</Label>
          <Textarea
            id="agent-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-[110px]"
          />
        </div>
      </AIFormSection>

      <AIFormSection
        title="Guardrails"
        description="Control tool access, escalation, and operator safety."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="allowed-tools">Allowed tools</Label>
            <Textarea
              id="allowed-tools"
              value={allowedTools}
              onChange={(event) => setAllowedTools(event.target.value)}
              className="min-h-[130px] font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="escalation-policy">Escalation policy</Label>
            <Input
              id="escalation-policy"
              value={escalationPolicy}
              onChange={(event) => setEscalationPolicy(event.target.value)}
              placeholder="approval_gate"
            />
          </div>
        </div>
      </AIFormSection>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Publishing...' : 'Publish'}
        </Button>
        <Button type="button" variant="outline">
          Save Draft
        </Button>
        <Button type="button" variant="outline">
          Validate
        </Button>
      </div>
    </form>
  );
}
