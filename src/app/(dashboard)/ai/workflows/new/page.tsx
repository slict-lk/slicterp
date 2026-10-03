import { WorkflowComposer } from '@/components/ai/workflow-composer';
import { AIPageShell, AISectionCard } from '@/components/ai/ai-primitives';
import { listPolicyProfiles } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AINewWorkflowPage() {
  const { tenantId } = await requireAIAccess('create');
  const policies = await listPolicyProfiles(tenantId);

  return (
    <AIPageShell
      title="Create Automation"
      description="Use the guided builder to turn a business need into an approval-aware automation."
    >
      <AISectionCard
        title="Automation Builder"
        description="Choose the business outcome, trigger, action, and review posture before publishing."
      >
        <WorkflowComposer policyProfiles={policies.map((policy) => ({ id: policy.id, name: policy.name }))} />
      </AISectionCard>
    </AIPageShell>
  );
}
