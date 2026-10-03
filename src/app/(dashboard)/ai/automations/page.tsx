import { AIActionLink, AIEmptyState, AIPageShell, AISectionCard, AIStatusBadge, AIStatGrid } from '@/components/ai/ai-primitives';
import { listWorkflowRegistry, listWorkflowTemplates } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';
import { getEventCatalogItem, getModuleLabel } from '@/lib/ai/ui-metadata';

export const dynamic = 'force-dynamic';

export default async function AIAutomationsPage() {
  const { tenantId } = await requireAIAccess('view');
  const [workflows, templates] = await Promise.all([listWorkflowRegistry(tenantId), listWorkflowTemplates(tenantId)]);

  return (
    <AIPageShell
      title="Automations"
      description="Create, review, and roll out automations in business language before opening the technical detail."
      actions={
        <>
          <AIActionLink href="/ai/workflows/new" label="New Automation" />
          <AIActionLink href="/ai/templates" label="Open Templates" variant="outline" />
        </>
      }
    >
      <AIStatGrid
        items={[
          {
            label: 'Published automations',
            value: String(workflows.filter((workflow) => workflow.status === 'active').length),
            hint: 'Automations currently live',
            tone: 'sky',
          },
          {
            label: 'Draft or paused',
            value: String(workflows.filter((workflow) => workflow.status !== 'active').length),
            hint: 'Automations not currently running',
            tone: 'amber',
          },
          {
            label: 'Reusable templates',
            value: String(templates.length),
            hint: 'Blueprints available for fast rollout',
            tone: 'emerald',
          },
          {
            label: 'Covered modules',
            value: String(new Set(workflows.map((workflow) => workflow.module)).size),
            hint: 'Business areas with at least one automation',
            tone: 'slate',
          },
        ]}
      />

      <AISectionCard
        title="Most recent automations"
        description="Start here if you want to understand what is already in place for the tenant."
      >
        {workflows.length === 0 ? (
          <AIEmptyState
            title="No automations yet"
            description="Create the first automation using the guided builder."
            action={<AIActionLink href="/ai/workflows/new" label="Create first automation" />}
          />
        ) : (
          <div className="space-y-3">
            {workflows.slice(0, 6).map((workflow) => (
              <div key={`${workflow.source}-${workflow.id}`} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{workflow.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{workflow.description || 'No description provided.'}</p>
                  </div>
                  <AIStatusBadge status={workflow.status} />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                  <p>Area: {getModuleLabel(workflow.module)}</p>
                  <p>Trigger: {getEventCatalogItem(workflow.trigger)?.label || workflow.trigger}</p>
                  <p>Source: {workflow.source.replaceAll('-', ' ')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </AISectionCard>
    </AIPageShell>
  );
}
