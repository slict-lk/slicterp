import { AIPageShell } from '@/components/ai/ai-primitives';
import { AIAdminSummaryStrip } from '@/components/ai/ai-admin-summary-strip';
import { ModelsManager } from '@/components/ai/models-manager';
import { listModels } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIModelsPage() {
  const { tenantId } = await requireAIAccess('view');
  const models = await listModels(tenantId);

  return (
    <AIPageShell
      title="Models"
      description="Choose the primary and backup AI providers used by assistants and automations."
    >
      <AIAdminSummaryStrip
        title="Provider routing and fallback behavior"
        audience="AI admins and automation designers"
        readiness={models.length > 0 ? `${models.length} model record(s) configured` : 'Setup needed'}
        description="Business teams should not need raw model settings. This page decides which providers the module can use."
      />
      <ModelsManager initialModels={models} />
    </AIPageShell>
  );
}
