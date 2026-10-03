import { notFound } from 'next/navigation';
import { AIPageShell } from '@/components/ai/ai-primitives';
import { WorkflowDetailView } from '@/components/ai/workflow-detail-view';
import { getWorkflowDetail, toWorkflowDefinition } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIWorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await requireAIAccess('view');
  const { id } = await params;
  const detail = await getWorkflowDetail(tenantId, id);

  if (!detail) {
    notFound();
  }

  const definition = toWorkflowDefinition(detail.workflow);
  const moduleScope = detail.workflow.moduleScope || String((definition.steps[0]?.config?.module as string) || 'crm');

  return (
    <AIPageShell
      title={definition.name}
      description="Review what this automation does, how it has performed, and whether it needs attention."
    >
      <WorkflowDetailView
        workflowId={definition.id}
        definition={definition}
        moduleScope={moduleScope}
        versions={detail.versions}
        executions={detail.executions}
        queuedRuns={detail.queuedRuns}
        deadLetters={detail.deadLetters}
      />
    </AIPageShell>
  );
}
