import { AIPageShell } from '@/components/ai/ai-primitives';
import { TemplatesManager } from '@/components/ai/templates-manager';
import { listWorkflowTemplates } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AITemplatesPage() {
  const { tenantId } = await requireAIAccess('view');
  const templates = await listWorkflowTemplates(tenantId);

  return (
    <AIPageShell
      title="Templates"
      description="Reusable workflow blueprints to accelerate rollout across business modules."
    >
      <TemplatesManager initialTemplates={templates} />
    </AIPageShell>
  );
}
