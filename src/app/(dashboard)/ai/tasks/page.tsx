import { AIActionLink, AIEmptyState, AIPageShell, AISectionCard, AIStatusBadge } from '@/components/ai/ai-primitives';
import { getCommandCenterData } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';
import { getModuleLabel } from '@/lib/ai/ui-metadata';

export const dynamic = 'force-dynamic';

export default async function AITasksPage() {
  const { tenantId, user, aiRoles } = await requireAIAccess('view');
  const data = await getCommandCenterData(tenantId, {
    userId: user.id,
    isAdmin: aiRoles.includes('AI_ADMIN') || aiRoles.includes('AUTOMATION_DESIGNER'),
    aiRoles,
  });

  return (
    <AIPageShell
      title="Tasks"
      description="This view collects the decisions, failures, and operational issues that need human follow-up."
      actions={<AIActionLink href="/ai/inbox" label="Open Approval Inbox" />}
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <AISectionCard
          title="Approval work"
          description="Approvers should start here to clear the highest-impact decisions first."
        >
          {data.pendingApprovals.length === 0 ? (
            <AIEmptyState title="No decisions waiting" description="There are no approval items in the queue." />
          ) : (
            <div className="space-y-3">
              {data.pendingApprovals.map((approval) => (
                <div key={approval.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{approval.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{approval.summary}</p>
                    </div>
                    <AIStatusBadge status={`Risk ${approval.riskScore}`} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Module: {getModuleLabel(approval.module)}</p>
                </div>
              ))}
            </div>
          )}
        </AISectionCard>

        <AISectionCard
          title="Automation issues"
          description="Runs that need review because they failed or could not finish cleanly."
        >
          {data.failedRuns.length === 0 ? (
            <AIEmptyState title="No current issues" description="Recent automations completed without recorded failures." />
          ) : (
            <div className="space-y-3">
              {data.failedRuns.map((run) => (
                <div key={run.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{run.workflowName}</p>
                      <p className="mt-1 text-sm text-slate-600">{run.error || 'The run did not complete.'}</p>
                    </div>
                    <AIStatusBadge status="Needs attention" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{new Date(run.startedAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </AISectionCard>
      </div>
    </AIPageShell>
  );
}
