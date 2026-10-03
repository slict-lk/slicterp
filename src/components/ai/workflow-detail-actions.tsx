"use client";

import { useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AIFormSection } from '@/components/ai/ai-primitives';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { readResponseError } from '@/components/ai/registry-manager-utils';
import { useAIExperience } from '@/components/ai/ai-experience-context';
import type { WorkflowSimulationResult, WorkflowVersionRecord } from '@/lib/ai/control-plane-types';

export function WorkflowDetailActions({
  workflowId,
  workflowName,
  enabled,
  versions,
}: {
  workflowId: string;
  workflowName: string;
  enabled: boolean;
  versions: WorkflowVersionRecord[];
}) {
  const router = useRouter();
    const { canUseAdvanced } = useAIExperience();
  const [payload, setPayload] = useState('{\n  "source": "manual-test"\n}');
  const [workingAction, setWorkingAction] = useState<string | null>(null);
  const [rollbackVersionId, setRollbackVersionId] = useState<string>(versions[0]?.id || '');
  const [simulation, setSimulation] = useState<WorkflowSimulationResult | null>(null);

  const refresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const toggleWorkflow = async () => {
    setWorkingAction('toggle');

    try {
      const response = await fetch(`/api/ai/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !enabled }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to update workflow status'));
      }

      toast.success(enabled ? 'Automation paused' : 'Automation resumed', { description: workflowName });
      refresh();
    } catch (error: any) {
      toast.error('Workflow update failed', {description: error.message || 'Failed to update workflow status' });
    } finally {
      setWorkingAction(null);
    }
  };

  const cloneWorkflow = async () => {
    setWorkingAction('clone');

    try {
      const response = await fetch(`/api/ai/workflows/${workflowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clone' }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to clone workflow'));
      }

      const clone = await response.json();
      toast.success('Workflow cloned', { description: clone.name, });
      router.push(`/ai/workflows/${clone.id}`);
      refresh();
    } catch (error: any) {
      toast.error('Clone failed', {description: error.message || 'Failed to clone workflow' });
    } finally {
      setWorkingAction(null);
    }
  };

  const archiveWorkflow = async () => {
    if (!window.confirm(`Archive workflow "${workflowName}"?`)) {
      return;
    }

    setWorkingAction('archive');

    try {
      const response = await fetch(`/api/ai/workflows/${workflowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to archive workflow'));
      }

      toast.success('Automation archived', { description: workflowName, });
      refresh();
    } catch (error: any) {
      toast.error('Archive failed', {description: error.message || 'Failed to archive workflow' });
    } finally {
      setWorkingAction(null);
    }
  };

  const rollbackWorkflow = async () => {
    if (!rollbackVersionId) {
      return;
    }

    setWorkingAction('rollback');

    try {
      const response = await fetch(`/api/ai/workflows/${workflowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback', versionId: rollbackVersionId }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to rollback workflow'));
      }

      toast.success('Automation restored', { description: workflowName, });
      refresh();
    } catch (error: any) {
      toast.error('Rollback failed', {description: error.message || 'Failed to rollback workflow' });
    } finally {
      setWorkingAction(null);
    }
  };

  const runTest = async () => {
    setWorkingAction('test');

    try {
      const parsedPayload = payload.trim() ? JSON.parse(payload) : {};
      const response = await fetch(`/api/ai/workflows/${workflowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_test',
          triggerData: parsedPayload,
        }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to run workflow test'));
      }

      toast.success('Automation test executed', { description: 'A real execution record has been created.' });
      refresh();
    } catch (error: any) {
      toast.error('Test failed', {description: error.message || 'Failed to run workflow test' });
    } finally {
      setWorkingAction(null);
    }
  };

  const runSimulation = async () => {
    setWorkingAction('simulate');

    try {
      const parsedPayload = payload.trim() ? JSON.parse(payload) : {};
      const response = await fetch(`/api/ai/workflows/${workflowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate',
          triggerData: parsedPayload,
        }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to simulate workflow'));
      }

      const result = (await response.json()) as WorkflowSimulationResult;
      setSimulation(result);
      toast.success('Simulation completed', { description: result.summary, });
    } catch (error: any) {
      toast.error('Simulation failed', {description: error.message || 'Failed to simulate workflow' });
    } finally {
      setWorkingAction(null);
    }
  };

  const deleteWorkflow = async () => {
    if (!window.confirm(`Delete workflow "${workflowName}"?`)) {
      return;
    }

    setWorkingAction('delete');

    try {
      const response = await fetch(`/api/ai/workflows/${workflowId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to delete workflow'));
      }

      toast.success('Automation deleted', { description: workflowName, });
      router.push('/ai/workflows');
      refresh();
    } catch (error: any) {
      toast.error('Delete failed', {description: error.message || 'Failed to delete workflow' });
    } finally {
      setWorkingAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={toggleWorkflow} disabled={workingAction !== null}>
          {workingAction === 'toggle' ? 'Updating...' : enabled ? 'Pause Automation' : 'Resume Automation'}
        </Button>
        <Button type="button" variant="outline" onClick={cloneWorkflow} disabled={workingAction !== null}>
          {workingAction === 'clone' ? 'Cloning...' : 'Clone Automation'}
        </Button>
        <Button type="button" variant="outline" onClick={archiveWorkflow} disabled={workingAction !== null}>
          {workingAction === 'archive' ? 'Archiving...' : 'Archive'}
        </Button>
        <Button type="button" onClick={runTest} disabled={workingAction !== null}>
          {workingAction === 'test' ? 'Running Test...' : 'Test Automation'}
        </Button>
        <Button type="button" variant="outline" onClick={runSimulation} disabled={workingAction !== null}>
          {workingAction === 'simulate' ? 'Simulating...' : 'Preview Outcome'}
        </Button>
        <Button type="button" variant="destructive" onClick={deleteWorkflow} disabled={workingAction !== null}>
          {workingAction === 'delete' ? 'Deleting...' : 'Delete Automation'}
        </Button>
      </div>

      <AIFormSection
        title="Rollback"
        description="Restore the automation from a saved version snapshot."
      >
        <div className="flex flex-wrap gap-2">
          <Select value={rollbackVersionId} onValueChange={setRollbackVersionId}>
            <SelectTrigger className="min-w-[260px]">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {`v${version.version} • ${version.reason} • ${new Date(version.createdAt).toLocaleString()}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={rollbackWorkflow}
            disabled={workingAction !== null || !rollbackVersionId}
          >
            {workingAction === 'rollback' ? 'Rolling Back...' : 'Rollback to Selected Version'}
          </Button>
        </div>
      </AIFormSection>

      <AIFormSection
        title="Test Payload"
        description="This runs a real workflow execution and may create approval items or downstream records, depending on the workflow steps."
      >
        <Textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          className="min-h-[140px] font-mono"
        />
      </AIFormSection>

      {simulation ? (
        <AIFormSection
          title="Simulation Result"
          description={simulation.summary}
        >
          <div className="space-y-2">
            {simulation.steps.map((step) => (
              <div key={step.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{step.id}</p>
                    <p className="text-sm text-slate-600">{step.message}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {step.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </AIFormSection>
      ) : null}
    </div>
  );
}
