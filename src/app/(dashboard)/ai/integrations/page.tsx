import { AIPageShell } from '@/components/ai/ai-primitives';
import { AIAdminSummaryStrip } from '@/components/ai/ai-admin-summary-strip';
import { IntegrationsManager } from '@/components/ai/integrations-manager';
import { listIntegrationConfigs } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIIntegrationsPage() {
  const { tenantId } = await requireAIAccess('view');
  const integrations = await listIntegrationConfigs(tenantId);

  return (
    <AIPageShell
      title="Integrations"
      description="Track what each connector is for, whether it is healthy, and how the module is allowed to use it."
    >
      <AIAdminSummaryStrip
        title="Connector purpose, health, and safe usage"
        audience="AI admins"
        readiness={integrations.length > 0 ? `${integrations.length} integration record(s) configured` : 'Setup needed'}
        description="Integrations govern external providers and execution boundaries for the AI workspace."
      />
      <IntegrationsManager initialIntegrations={integrations} />
    </AIPageShell>
  );
}
