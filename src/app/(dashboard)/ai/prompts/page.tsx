import { AIPageShell } from '@/components/ai/ai-primitives';
import { AIAdminSummaryStrip } from '@/components/ai/ai-admin-summary-strip';
import { PromptsManager } from '@/components/ai/prompts-manager';
import { listModels, listPrompts } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIPromptsPage() {
  const { tenantId } = await requireAIAccess('view');
  const [prompts, models] = await Promise.all([listPrompts(tenantId), listModels(tenantId)]);

  return (
    <AIPageShell
      title="Prompts"
      description="Store reusable AI instructions by business purpose instead of scattering them across modules."
    >
      <AIAdminSummaryStrip
        title="Reusable instructions for assistants and automations"
        audience="Automation designers"
        readiness={prompts.length > 0 ? `${prompts.length} prompt record(s) configured` : 'Setup needed'}
        description="Prompts define how assistants and AI actions should respond for each business use case."
      />
      <PromptsManager initialPrompts={prompts} models={models} />
    </AIPageShell>
  );
}
