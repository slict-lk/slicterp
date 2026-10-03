import { AIPageShell } from '@/components/ai/ai-primitives';
import { AIAdminSummaryStrip } from '@/components/ai/ai-admin-summary-strip';
import { PoliciesManager } from '@/components/ai/policies-manager';
import { listPolicyProfiles } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIPoliciesPage() {
  const { tenantId } = await requireAIAccess('view');
  const policies = await listPolicyProfiles(tenantId);

  return (
    <AIPageShell
      title="Policies"
      description="Define which actions are low risk, which need approval, and which should be escalated immediately."
    >
      <AIAdminSummaryStrip
        title="Approval posture and risk governance"
        audience="AI admins"
        readiness={policies.length > 0 ? `${policies.length} policy profile(s) configured` : 'Setup needed'}
        description="Policies control how safely the system can act before a person needs to step in."
      />
      <PoliciesManager initialPolicies={policies} />
    </AIPageShell>
  );
}
