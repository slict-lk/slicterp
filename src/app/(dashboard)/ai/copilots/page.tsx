import { AIPageShell } from '@/components/ai/ai-primitives';
import { CopilotsManager } from '@/components/ai/copilots-manager';
import { listCopilotConfigs } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AICopilotsPage() {
  const { tenantId } = await requireAIAccess('view');
  const copilots = await listCopilotConfigs(tenantId);

  return (
    <AIPageShell
      title="Copilots"
      description="Module-by-module copilots, their allowed intents, and action safety posture."
    >
      <CopilotsManager initialCopilots={copilots} />
    </AIPageShell>
  );
}
