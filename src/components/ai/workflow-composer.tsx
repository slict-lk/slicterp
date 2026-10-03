"use client";

import { useEffect, useMemo, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AIEmptyState, AIFormSection } from '@/components/ai/ai-primitives';
import { useAIExperience } from '@/components/ai/ai-experience-context';
import type { DomainModule } from '@/lib/ai/control-plane-types';
import { buildActionPayloadFromSimpleForm, getActionUIMetadata, listActionUIMetadata, listEventCatalog, summarizeWorkflow } from '@/lib/ai/ui-metadata';

type StepRow = {
  id: string;
  kind: 'condition' | 'ai_decision' | 'action' | 'delay' | 'notification';
  label: string;
  config: string;
};

type ApprovalMode = 'always' | 'policy' | 'never';

type SimpleActionValue = string | boolean;

const MODULE_OPTIONS: DomainModule[] = ['crm', 'accounting', 'spareparts', 'real-estate', 'restaurant', 'vehicle-export', 'hr', 'projects', 'studio'];
const STEP_OPTIONS: StepRow['kind'][] = ['condition', 'ai_decision', 'action', 'delay', 'notification'];
const MODULE_LABELS: Record<DomainModule, string> = {
  crm: 'CRM',
  accounting: 'Accounting',
  spareparts: 'Spare Parts',
  'real-estate': 'Real Estate',
  restaurant: 'Restaurant',
  'vehicle-export': 'Vehicle Export',
  hr: 'HR',
  projects: 'Projects',
  studio: 'Studio',
};
const GOAL_OPTIONS: Record<DomainModule, string[]> = {
  crm: ['Follow up with a customer', 'Prepare outreach for a new opportunity', 'Escalate risky deals'],
  accounting: ['Route a financial change for review', 'Prepare an adjustment entry', 'Flag invoice follow-up'],
  spareparts: ['Create a replenishment action', 'Prepare supplier follow-up', 'Respond to low stock'],
  'real-estate': ['Schedule a client interaction', 'Coordinate property follow-up', 'Prepare viewing workflow'],
  restaurant: ['Guide the next shift', 'Push an operations reminder', 'Prepare a service follow-up'],
  'vehicle-export': ['Coordinate shipment progress', 'Update dispatch status', 'Prepare logistics follow-up'],
  hr: ['Onboard a new employee', 'Flag a policy violation', 'Coordinate leave approval'],
  projects: ['Track project milestone', 'Coordinate task assignment', 'Prepare project status update'],
  studio: ['Create a custom record automatically', 'Route custom module work', 'Capture operational data'],
};

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function WorkflowComposer({
  policyProfiles,
}: {
  policyProfiles: Array<{ id: string; name: string }>;
}) {
  const hasPolicies = policyProfiles.length > 0;
  const router = useRouter();
  const { canUseAdvanced } = useAIExperience();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [moduleScope, setModuleScope] = useState<DomainModule>('crm');
  const [triggerEvent, setTriggerEvent] = useState('record.updated');
  const [policyProfileId, setPolicyProfileId] = useState(policyProfiles[0]?.id || '');
  const [approvalsMode, setApprovalsMode] = useState<ApprovalMode>('policy');
  const [filters, setFilters] = useState('{}');
  const [steps, setSteps] = useState<StepRow[]>([
    {
      id: 'step-1',
      kind: 'notification',
      label: 'Notify operator',
      config: '{\n  "channel": "in-app"\n}',
    },
  ]);

  const [wizardStep, setWizardStep] = useState(0);
  const [goal, setGoal] = useState(GOAL_OPTIONS.crm[0]);
  const [simpleTriggerEvent, setSimpleTriggerEvent] = useState(listEventCatalog('crm')[0]?.event || 'manual.crm.followup');
  const [simpleAction, setSimpleAction] = useState(listActionUIMetadata('crm')[0]?.action || 'follow_up_task');
  const [simpleActionValues, setSimpleActionValues] = useState<Record<string, SimpleActionValue>>({ priority: 'HIGH' });

  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availableTriggers = useMemo(() => listEventCatalog(moduleScope), [moduleScope]);
  const availableActions = useMemo(() => listActionUIMetadata(moduleScope), [moduleScope]);
  const selectedActionMeta = useMemo(() => getActionUIMetadata(moduleScope, simpleAction), [moduleScope, simpleAction]);
  const simpleSummary = useMemo(() => {
    if (!selectedActionMeta) return 'Complete the setup steps to preview this automation.';
    return summarizeWorkflow(
      {
        trigger: { event: simpleTriggerEvent, filters: {} },
        steps: [
          {
            id: 'step-1',
            kind: 'action',
            config: {
              module: moduleScope,
              action: simpleAction,
              payload: buildActionPayloadFromSimpleForm(moduleScope, simpleAction, simpleActionValues),
            },
          },
        ],
      },
      moduleScope
    );
  }, [moduleScope, simpleAction, simpleActionValues, simpleTriggerEvent, selectedActionMeta]);

  useEffect(() => {
    const nextTrigger = listEventCatalog(moduleScope)[0]?.event || 'record.updated';
    const nextAction = listActionUIMetadata(moduleScope)[0]?.action || 'follow_up_task';
    setSimpleTriggerEvent((current) => (listEventCatalog(moduleScope).some((item) => item.event === current) ? current : nextTrigger));
    setSimpleAction((current) => (listActionUIMetadata(moduleScope).some((item) => item.action === current) ? current : nextAction));
    setGoal((current) => (GOAL_OPTIONS[moduleScope].includes(current) ? current : GOAL_OPTIONS[moduleScope][0]));
  }, [moduleScope]);

  useEffect(() => {
    if (!name.trim()) {
      setName(`${MODULE_LABELS[moduleScope]} - ${goal}`);
    }
  }, [goal, moduleScope, name]);

  useEffect(() => {
    if (!description.trim()) {
      setDescription(simpleSummary);
    }
  }, [description, simpleSummary]);

  const updateStep = (id: string, patch: Partial<StepRow>) => {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  };

  const addStep = () => {
    setSteps((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        kind: 'action',
        label: `Step ${current.length + 1}`,
        config: '{\n  "actionType": "module_action"\n}',
      },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps((current) => current.filter((step) => step.id !== id));
  };

  const setSimpleField = (key: string, value: SimpleActionValue) => {
    setSimpleActionValues((current) => ({ ...current, [key]: value }));
  };

  const buildAdvancedPayload = () => {
    let parsedFilters = {};
    try {
      parsedFilters = filters.trim() ? JSON.parse(filters) : {};
    } catch {
      throw new Error('Invalid JSON in filters field');
    }

    return {
      name,
      description,
      moduleScope,
      triggerEvent,
      policyProfileId,
      approvalsMode,
      filters: parsedFilters,
      steps: steps.map((step) => {
        let parsedConfig = {};
        try {
          parsedConfig = JSON.parse(step.config || '{}');
        } catch {
          throw new Error(`Invalid JSON in config for step "${step.label}"`);
        }
        return {
          id: step.id,
          kind: step.kind,
          config: {
            label: step.label,
            ...parsedConfig,
          },
        };
      }),
    };
  };

  const buildSimplePayload = () => {
    if (!selectedActionMeta) {
      throw new Error('Choose an action before publishing the automation.');
    }

    if (!name.trim()) {
      throw new Error('Automation name is required.');
    }

    if (!policyProfileId.trim()) {
      throw new Error('Approval policy is required.');
    }

    for (const field of selectedActionMeta.fields) {
      if (!field.required) continue;
      const value = simpleActionValues[field.key];
      const missing = typeof value === 'boolean' ? value === false && field.type !== 'boolean' : String(value || '').trim() === '';
      if (missing) {
        throw new Error(`${field.label} is required.`);
      }
    }

    return {
      name,
      description: description || simpleSummary,
      moduleScope,
      triggerEvent: simpleTriggerEvent,
      policyProfileId,
      approvalsMode,
      filters: {},
      steps: [
        {
          id: 'step-1',
          kind: 'action' as const,
          config: {
            label: selectedActionMeta.label,
            actionType: 'module_action',
            module: moduleScope,
            action: simpleAction,
            payload: buildActionPayloadFromSimpleForm(moduleScope, simpleAction, simpleActionValues),
          },
        },
      ],
    };
  };

  const buildPayload = () => buildSimplePayload();

  const submitWorkflow = async (isDraft: boolean) => {
    setError(null);
    setFeedback(null);
    setSubmitting(true);

    try {
      const payload = {
        ...buildPayload(),
        isActive: !isDraft,
      };

      const response = await fetch('/api/ai/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Failed to create workflow' }));
        throw new Error(body.error || 'Failed to create workflow');
      }

      const workflow = await response.json();
      startTransition(() => {
        router.push(`/ai/workflows/${workflow.id}`);
        router.refresh();
      });
    } catch (submitError: any) {
      setError(submitError.message || 'Failed to create workflow');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitWorkflow(false);
  };

  const validateWorkflow = () => {
    try {
      const payload = buildPayload();
      if (!payload.name.trim()) {
        throw new Error('Automation name is required.');
      }
      if (!payload.triggerEvent.trim()) {
        throw new Error('A trigger is required.');
      }
      if (!payload.policyProfileId.trim()) {
        throw new Error('Approval policy is required.');
      }

      setError(null);
      setFeedback(`Validation passed. ${payload.steps.length} step(s) are ready.`);
    } catch (validationError: any) {
      setFeedback(null);
      setError(validationError.message || 'Workflow validation failed');
    }
  };

  const simulateDraft = () => {
    try {
      const payload = buildPayload();
      setError(null);
      setFeedback(`Preview complete. ${payload.steps.length} step(s) are prepared to run when the trigger occurs.`);
    } catch (simulationError: any) {
      setFeedback(null);
      setError(simulationError.message || 'Simulation failed');
    }
  };

  const renderField = (field: NonNullable<typeof selectedActionMeta>['fields'][number]) => {
    const value = simpleActionValues[field.key];
    const helper = <p className="text-xs text-slate-500">Why this matters: {field.description}</p>;

    if (field.type === 'textarea' || field.type === 'list') {
      return (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Textarea
            id={field.key}
            value={String(value || '')}
            onChange={(event) => setSimpleField(field.key, event.target.value)}
            rows={field.rows || (field.type === 'list' ? 4 : 3)}
            placeholder={field.placeholder}
          />
          {helper}
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.key} className="space-y-2">
          <Label>{field.label}</Label>
          <Select value={String(value || field.options?.[0]?.value || '')} onValueChange={(nextValue) => setSimpleField(field.key, nextValue)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {helper}
        </div>
      );
    }

    if (field.type === 'boolean') {
      return (
        <div key={field.key} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor={field.key}>{field.label}</Label>
              <p className="mt-1 text-xs text-slate-500">Why this matters: {field.description}</p>
            </div>
            <Switch id={field.key} checked={value === true} onCheckedChange={(checked) => setSimpleField(field.key, checked)} />
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key}>{field.label}</Label>
        <Input
          id={field.key}
          type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : field.type === 'datetime' ? 'datetime-local' : 'text'}
          value={String(value || '')}
          onChange={(event) => setSimpleField(field.key, event.target.value)}
          placeholder={field.placeholder}
        />
        {helper}
      </div>
    );
  };

  const wizardLabels = ['Goal', 'Trigger', 'Action', 'Approval', 'Review'];

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {wizardLabels.map((label, index) => (
            <div key={label} className={`rounded-full px-3 py-1.5 text-sm font-medium ${index === wizardStep ? 'bg-sky-600 text-white' : index < wizardStep ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 border border-slate-200'}`}>
              {index + 1}. {label}
            </div>
          ))}
        </div>
      </div>

      {wizardStep === 0 ? (
        <AIFormSection title="Goal" description="Choose the business outcome first. The automation name and description can stay plain-language.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Business area</Label>
              <Select value={moduleScope} onValueChange={(value) => setModuleScope(value as DomainModule)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {MODULE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Why this matters: this keeps the automation focused on one business area and its safe actions.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-name">Automation name</Label>
              <Input id="automation-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="CRM - Follow up with a customer" />
              <p className="text-xs text-slate-500">Why this matters: staff should understand the purpose without opening technical details.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Outcome</Label>
            <div className="grid gap-3 md:grid-cols-3">
              {GOAL_OPTIONS[moduleScope].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGoal(option)}
                  className={`rounded-xl border px-4 py-3 text-left ${goal === option ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  <span className="text-sm font-medium">{option}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Why this matters: the builder keeps the setup grounded in a business outcome instead of a raw event name.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="automation-description">What this automation should do</Label>
            <Textarea id="automation-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
            <p className="text-xs text-slate-500">Why this matters: business users should be able to read the purpose in one sentence.</p>
          </div>
        </AIFormSection>
      ) : null}

      {wizardStep === 1 ? (
        <AIFormSection title="Trigger" description="Choose the event in plain language. The technical event name stays behind the scenes.">
          <div className="grid gap-3">
            {availableTriggers.map((trigger) => (
              <button
                key={trigger.event}
                type="button"
                onClick={() => setSimpleTriggerEvent(trigger.event)}
                className={`rounded-xl border p-4 text-left ${simpleTriggerEvent === trigger.event ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-700'}`}
              >
                <p className="font-medium">{trigger.label}</p>
                <p className="mt-1 text-sm text-slate-600">{trigger.description}</p>
              </button>
            ))}
          </div>
        </AIFormSection>
      ) : null}

      {wizardStep === 2 ? (
        <AIFormSection title="Action" description="Choose the business action and fill in the required details without touching raw JSON.">
          {availableActions.length === 0 ? (
            <AIEmptyState title="No actions available" description="This business area does not have a guided action form yet." />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {availableActions.map((action) => (
                  <button
                    key={action.action}
                    type="button"
                    onClick={() => setSimpleAction(action.action)}
                    className={`rounded-xl border p-4 text-left ${simpleAction === action.action ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-700'}`}
                  >
                    <p className="font-medium">{action.label}</p>
                    <p className="mt-1 text-sm text-slate-600">{action.shortDescription}</p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{action.category}</p>
                  </button>
                ))}
              </div>

              {selectedActionMeta ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedActionMeta.fields.map((field) => renderField(field))}
                </div>
              ) : null}
            </div>
          )}
        </AIFormSection>
      ) : null}

      {wizardStep === 3 ? (
        <AIFormSection title="Approval" description="Choose how much human review this automation needs before it can act.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Approval policy</Label>
              {hasPolicies ? (
                <Select value={policyProfileId} onValueChange={setPolicyProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select policy" />
                  </SelectTrigger>
                  <SelectContent>
                    {policyProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={policyProfileId} onChange={(event) => setPolicyProfileId(event.target.value)} placeholder="Enter policy profile ID" />
              )}
              <p className="text-xs text-slate-500">Why this matters: policies decide when people must review a sensitive action.</p>
            </div>
            <div className="space-y-2">
              <Label>Approval behavior</Label>
              <Select value={approvalsMode} onValueChange={(value) => setApprovalsMode(value as ApprovalMode)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select approvals mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">Use the selected approval policy</SelectItem>
                  <SelectItem value="always">Always ask for approval</SelectItem>
                  <SelectItem value="never">Allow it to run without approval</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Why this matters: this is the main safety setting for the automation.</p>
            </div>
          </div>
        </AIFormSection>
      ) : null}

      {wizardStep === 4 ? (
        <AIFormSection title="Review" description="Read the summary below before publishing or testing the automation.">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sky-700">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-semibold">Automation summary</p>
            </div>
            <p className="text-sm text-slate-800">{simpleSummary}</p>
            <div className="grid gap-3 md:grid-cols-3 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">Area:</span> {MODULE_LABELS[moduleScope]}</p>
              <p><span className="font-medium text-slate-900">Trigger:</span> {sentenceCase(listEventCatalog(moduleScope).find((item) => item.event === simpleTriggerEvent)?.label || simpleTriggerEvent)}</p>
              <p><span className="font-medium text-slate-900">Approval:</span> {approvalsMode === 'policy' ? 'Policy based' : approvalsMode === 'always' ? 'Always review' : 'No approval required'}</p>
            </div>
          </div>
        </AIFormSection>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}

      <div className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {simpleSummary}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setWizardStep((current) => Math.max(0, current - 1))} disabled={wizardStep === 0 || submitting}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {wizardStep < wizardLabels.length - 1 ? (
              <Button type="button" onClick={() => setWizardStep((current) => Math.min(wizardLabels.length - 1, current + 1))}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => submitWorkflow(true)} disabled={submitting || !policyProfileId.trim()}>
              Save Draft
            </Button>
            <Button type="button" variant="outline" onClick={validateWorkflow}>
              Validate
            </Button>
            <Button type="button" variant="outline" onClick={simulateDraft}>
              Preview Outcome
            </Button>
            <Button type="submit" disabled={submitting || !policyProfileId.trim()}>
              {submitting ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
