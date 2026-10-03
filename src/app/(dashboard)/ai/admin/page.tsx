import { AIActionLink, AIPageShell, AISectionCard } from '@/components/ai/ai-primitives';
import { listIntegrationConfigs, listModels, listPolicyProfiles, listPrompts } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIAdminPage() {
  const { tenantId } = await requireAIAccess('view');
  const [models, prompts, policies, integrations] = await Promise.all([
    listModels(tenantId),
    listPrompts(tenantId),
    listPolicyProfiles(tenantId),
    listIntegrationConfigs(tenantId),
  ]);

  const cards = [
    {
      title: 'Models',
      href: '/ai/models',
      count: models.length,
      description: 'Set the primary and backup AI providers used by assistants and workflows.',
    },
    {
      title: 'Prompts',
      href: '/ai/prompts',
      count: prompts.length,
      description: 'Manage reusable instructions grouped by business use.',
    },
    {
      title: 'Policies',
      href: '/ai/policies',
      count: policies.length,
      description: 'Control when actions are low risk, need approval, or need escalation.',
    },
    {
      title: 'Integrations',
      href: '/ai/integrations',
      count: integrations.length,
      description: 'Track connector purpose, health, and governance boundaries.',
    },
    {
      title: 'Settings',
      href: '/ai/settings',
      count: 1,
      description: 'Adjust tenant defaults, diagnostics, retries, and notifications.',
    },
  ];

  return (
    <AIPageShell
      title="Admin"
      description="Use Admin for provider setup, governance, and tenant-wide defaults. Business users should not need this section day to day."
      actions={<AIActionLink href="/ai/settings" label="Open Settings" />}
    >
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <AISectionCard key={card.title} title={card.title} description={card.description} action={<AIActionLink href={card.href} label="Open" variant="outline" />}>
            <p className="text-3xl font-semibold text-slate-950">{card.count}</p>
            <p className="mt-2 text-sm text-slate-600">
              {card.title === 'Settings' ? 'Tenant configuration workspace' : `${card.count} record(s) configured`}
            </p>
          </AISectionCard>
        ))}
      </div>
    </AIPageShell>
  );
}
