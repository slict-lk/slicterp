import { AgentComposer } from '@/components/ai/agent-composer';
import { AIPageShell, AISectionCard } from '@/components/ai/ai-primitives';
import { listModels } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AINewAgentPage() {
  const { tenantId } = await requireAIAccess('create');
  const models = await listModels(tenantId);

  return (
    <AIPageShell
      title="Create Agent"
      description="Configure a governed AI agent that can operate across ERP modules with explicit tool permissions."
    >
      <AISectionCard
        title="Agent Composer"
        description="Capture identity, routing, tool access, and escalation settings."
      >
        <AgentComposer models={models} />
      </AISectionCard>
    </AIPageShell>
  );
}

