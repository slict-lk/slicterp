"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIEmptyState, AIMetaList, AISectionCard, AIStatusBadge } from '@/components/ai/ai-primitives';
import { WorkflowDetailActions } from '@/components/ai/workflow-detail-actions';
import { useAIExperience } from '@/components/ai/ai-experience-context';
import { getEventCatalogItem, getModuleLabel, summarizeWorkflow } from '@/lib/ai/ui-metadata';
import type { DomainModule, WorkflowDefinition, WorkflowVersionRecord } from '@/lib/ai/control-plane-types';

type DetailExecution = {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  error?: string | null;
};

type DetailQueueItem = {
  id: string;
  status: string;
  scheduledFor: string;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string | null;
  failureHistory?: unknown[];
};

export function WorkflowDetailView({
  workflowId,
  definition,
  moduleScope,
  versions,
  executions,
  queuedRuns,
  deadLetters,
}: {
  workflowId: string;
  definition: WorkflowDefinition;
  moduleScope: string;
  versions: WorkflowVersionRecord[];
  executions: DetailExecution[];
  queuedRuns: DetailQueueItem[];
  deadLetters: DetailQueueItem[];
}) {
  const { canUseAdvanced } = useAIExperience();
  const triggerLabel = getEventCatalogItem(definition.trigger.event)?.label || definition.trigger.event;
  const summary = summarizeWorkflow(definition, moduleScope as DomainModule);

  return (
    <div className="space-y-6">
      <AIMetaList
        items={[
          { label: 'Automation', value: definition.name },
          { label: 'Trigger', value: triggerLabel },
          { label: 'Approval policy', value: definition.policyProfileId || 'Unassigned' },
          { label: 'Status', value: definition.enabled ? 'Live' : 'Paused' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AISectionCard
          title="What this automation does"
          description="Plain-language summary for business users."
        >
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-800">{summary}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Business area</p>
                <p className="mt-2 text-sm text-slate-900">{getModuleLabel(moduleScope)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Trigger</p>
                <p className="mt-2 text-sm text-slate-900">{triggerLabel}</p>
              </div>
            </div>
          </div>
        </AISectionCard>

        <AISectionCard
          title="Automation controls"
          description="Test the automation, pause it, or manage its lifecycle."
        >
          <WorkflowDetailActions
            workflowId={workflowId}
            workflowName={definition.name}
            enabled={definition.enabled}
            versions={versions}
          />
        </AISectionCard>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="overview" className="rounded-full border border-slate-200 bg-white px-4 py-2 data-[state=active]:border-sky-600 data-[state=active]:bg-sky-600 data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="runs" className="rounded-full border border-slate-200 bg-white px-4 py-2 data-[state=active]:border-sky-600 data-[state=active]:bg-sky-600 data-[state=active]:text-white">
            Runs
          </TabsTrigger>
          <TabsTrigger value="issues" className="rounded-full border border-slate-200 bg-white px-4 py-2 data-[state=active]:border-sky-600 data-[state=active]:bg-sky-600 data-[state=active]:text-white">
            Issues
          </TabsTrigger>
          {canUseAdvanced ? (
            <TabsTrigger value="technical" className="rounded-full border border-slate-200 bg-white px-4 py-2 data-[state=active]:border-sky-600 data-[state=active]:bg-sky-600 data-[state=active]:text-white">
              Technical Details
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AISectionCard title="Steps" description="The business actions this automation will perform in order.">
            <div className="space-y-3">
              {definition.steps.map((step, index) => (
                <div key={step.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">Step {index + 1}</p>
                      <p className="text-sm text-slate-600">{String(step.config.label || step.kind)}</p>
                    </div>
                    <AIStatusBadge status={step.kind} />
                  </div>
                </div>
              ))}
            </div>
          </AISectionCard>
        </TabsContent>

        <TabsContent value="runs" className="space-y-6">
          <AISectionCard title="Execution history" description="Recent attempts to run this automation.">
            {executions.length === 0 ? (
              <AIEmptyState title="No runs recorded" description="This automation has not run yet for the current tenant." />
            ) : (
              <div className="space-y-3">
                {executions.map((execution) => (
                  <div key={execution.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{execution.status}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          Started {new Date(execution.startedAt).toLocaleString()}
                          {execution.completedAt ? ` • Completed ${new Date(execution.completedAt).toLocaleString()}` : ''}
                        </p>
                        {execution.error ? <p className="mt-2 text-sm text-red-600">{execution.error}</p> : null}
                      </div>
                      <AIStatusBadge status={execution.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AISectionCard>
        </TabsContent>

        <TabsContent value="issues" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <AISectionCard title="Retry scheduled" description="Runs that are waiting for another attempt.">
              {queuedRuns.length === 0 ? (
                <AIEmptyState title="No retries scheduled" description="There are no queued or retrying runs for this automation." />
              ) : (
                <div className="space-y-3">
                  {queuedRuns.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="font-medium text-slate-900">{new Date(item.scheduledFor).toLocaleString()}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Attempt {item.attemptCount} of {item.maxAttempts}
                      </p>
                      {!canUseAdvanced ? null : <p className="mt-1 text-xs text-slate-500">Queue status: {item.status}</p>}
                    </div>
                  ))}
                </div>
              )}
            </AISectionCard>

            <AISectionCard title="Could not complete" description="Runs that exhausted retries or failed permanently.">
              {deadLetters.length === 0 ? (
                <AIEmptyState title="No critical failures" description="This automation has no dead-letter items." />
              ) : (
                <div className="space-y-3">
                  {deadLetters.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="font-medium text-slate-900">{item.lastError || 'Automation failed'}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Failure count: {item.failureHistory?.length || 0}
                      </p>
                      {!canUseAdvanced ? null : <p className="mt-1 text-xs text-slate-500">Queue status: {item.status}</p>}
                    </div>
                  ))}
                </div>
              )}
            </AISectionCard>
          </div>
        </TabsContent>

        {canUseAdvanced ? (
          <TabsContent value="technical" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <AISectionCard title="Version timeline" description="Saved workflow snapshots available for rollback.">
                {versions.length === 0 ? (
                  <AIEmptyState title="No saved versions" description="New versions will appear after lifecycle actions." />
                ) : (
                  <div className="space-y-3">
                    {versions.map((version) => (
                      <div key={version.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="font-medium text-slate-900">{`v${version.version}`}</p>
                        <p className="mt-1 text-sm text-slate-600">{version.reason}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(version.createdAt).toLocaleString()} • {version.createdBy}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </AISectionCard>

              <AISectionCard title="Technical detail" description="Exact identifiers and runtime detail for advanced users.">
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p><span className="font-medium text-slate-900">Workflow ID:</span> {workflowId}</p>
                  <p><span className="font-medium text-slate-900">Trigger event:</span> {definition.trigger.event}</p>
                  <p><span className="font-medium text-slate-900">Policy profile:</span> {definition.policyProfileId || 'Unassigned'}</p>
                  <p><span className="font-medium text-slate-900">Step count:</span> {definition.steps.length}</p>
                </div>
              </AISectionCard>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
