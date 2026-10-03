import { AIActionLink, AIEmptyState, AIPageShell, AISectionCard } from '@/components/ai/ai-primitives';
import { listAgents, listCopilotConfigs } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';
import { getModuleLabel } from '@/lib/ai/ui-metadata';

export const dynamic = 'force-dynamic';

const EXAMPLE_QUESTIONS: Record<string, string[]> = {
  crm: ['Summarize priorities', 'Draft follow-up', 'Show risks'],
  accounting: ['Explain variance', 'Recommend next step', 'Summarize priorities'],
  spareparts: ['Show stock risks', 'Recommend reorder', 'Summarize priorities'],
  'real-estate': ['Prepare viewing brief', 'Show risks', 'Recommend next step'],
  restaurant: ['Summarize priorities', 'Show operational risks', 'Recommend next step'],
  'vehicle-export': ['Summarize shipment status', 'Show risks', 'Recommend next step'],
};

export const dynamicParams = true;

export default async function AIAssistantsPage() {
  const { tenantId } = await requireAIAccess('view');
  const [copilots, agents] = await Promise.all([listCopilotConfigs(tenantId), listAgents(tenantId)]);

  return (
    <AIPageShell
      title="Assistants"
      description="Assistants help staff with summaries, next steps, and guided work without exposing technical configuration."
      actions={
        <>
          <AIActionLink href="/ai/copilots" label="Manage Copilots" />
          <AIActionLink href="/ai/agents" label="Open Agents" variant="outline" />
        </>
      }
    >
      <AISectionCard
        title="Module assistants"
        description="Each assistant card explains what it helps with and whether it is ready for business users."
      >
        {copilots.length === 0 ? (
          <AIEmptyState
            title="No assistants configured"
            description="Enable at least one copilot so business users see guided prompts instead of a blank AI panel."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {copilots.map((copilot) => (
              <div key={copilot.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{copilot.label}</p>
                    <p className="mt-1 text-sm text-slate-600">{getModuleLabel(copilot.module)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${copilot.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {copilot.enabled ? 'Ready' : 'Setup needed'}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p><span className="font-medium text-slate-900">Helps with:</span> {copilot.allowedIntents.join(', ') || 'No intents configured'}</p>
                  <p><span className="font-medium text-slate-900">Approval posture:</span> {copilot.responseMode.replaceAll('_', ' ')}</p>
                  <p><span className="font-medium text-slate-900">Example prompts:</span> {(EXAMPLE_QUESTIONS[copilot.module] || ['Summarize priorities']).join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </AISectionCard>

      <AISectionCard title="Specialist agents" description="Agents are governed AI workers used for deeper orchestration tasks.">
        {agents.length === 0 ? (
          <AIEmptyState title="No agents configured" description="Agents are optional until the tenant needs more advanced routed AI behavior." />
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div key={agent.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-medium text-slate-900">{agent.name}</p>
                <p className="mt-1 text-sm text-slate-600">{agent.description}</p>
                <p className="mt-2 text-xs text-slate-500">Model: {agent.modelLabel} • Completed tasks: {agent.tasksCompleted}</p>
              </div>
            ))}
          </div>
        )}
      </AISectionCard>
    </AIPageShell>
  );
}
