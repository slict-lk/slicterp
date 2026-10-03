import { ApprovalQueue } from '@/components/ai/approval-queue';
import { AIActionLink, AIPageShell, AISectionCard } from '@/components/ai/ai-primitives';
import { listApprovalQueue } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIInboxPage() {
  const { tenantId } = await requireAIAccess('approve');
  const approvals = await listApprovalQueue(tenantId);

  return (
    <AIPageShell
      title="Approval Inbox"
      description="Review high-impact actions before the system can carry them out. Each decision stays fully auditable."
      actions={<AIActionLink href="/ai/tasks" label="Back to Tasks" variant="outline" />}
    >
      <AISectionCard
        title="Pending Decisions"
        description="Approve, reject, ask for changes, or escalate risk-sensitive actions."
      >
        <ApprovalQueue approvals={approvals} />
      </AISectionCard>
    </AIPageShell>
  );
}
