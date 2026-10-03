import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AIActionLink, AIEmptyState, AIPageShell, AISectionCard, AIStatGrid, AIStatusBadge } from '@/components/ai/ai-primitives';
import { AIOnboardingChecklist } from '@/components/ai/ai-onboarding-checklist';
import { Button } from '@/components/ui/button';
import { getCommandCenterData } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';
import { getModuleLabel } from '@/lib/ai/ui-metadata';

export const dynamic = 'force-dynamic';

export default async function AIOverviewPage() {
  const { tenantId, user, aiRoles } = await requireAIAccess('view');
  const data = await getCommandCenterData(tenantId, {
    userId: user.id,
    isAdmin: aiRoles.includes('AI_ADMIN') || aiRoles.includes('AUTOMATION_DESIGNER'),
    aiRoles,
  });

  const items = [
    {
      label: 'Live automations',
      value: String(data.summary.activeWorkflows),
      hint: 'Automations currently ready to run across the business.',
      tone: 'sky' as const,
    },
    {
      label: 'Pending decisions',
      value: String(data.summary.pendingApprovals),
      hint: 'Actions that still need a human approval.',
      tone: 'amber' as const,
    },
    {
      label: 'Needs attention',
      value: String(data.summary.failedRuns),
      hint: 'Automations that could not complete successfully.',
      tone: 'slate' as const,
    },
    {
      label: 'Ready assistants',
      value: String(data.summary.activeAgents),
      hint: 'Assistants and copilots currently enabled.',
      tone: 'emerald' as const,
    },
  ];

  const onboardingItems = [
    {
      key: 'model',
      label: 'Connect a primary AI provider',
      done: data.setupProgress.items.connectModel,
      href: '/ai/models',
      help: 'Choose the main AI provider business teams will rely on for assistants and reasoning.',
    },
    {
      key: 'policy',
      label: 'Choose a default approval policy',
      done: data.setupProgress.items.chooseDefaultPolicy,
      href: '/ai/policies',
      help: 'Set the default review posture for sensitive actions so automations stay controlled.',
    },
    {
      key: 'copilot',
      label: 'Enable at least one assistant',
      done: data.setupProgress.items.enableCopilot,
      href: '/ai/copilots',
      help: 'Turn on one copilot so business users can start with guided AI help in context.',
    },
    {
      key: 'automation',
      label: 'Publish your first automation',
      done: data.setupProgress.items.publishFirstAutomation,
      href: '/ai/workflows/new',
      help: 'Create one practical automation that saves manual follow-up or review effort.',
    },
    {
      key: 'inbox',
      label: 'Review the approval inbox',
      done: data.setupProgress.items.reviewApprovalInbox,
      href: '/ai/inbox',
      help: 'Make sure approvers understand where risky actions appear and how to act on them.',
    },
  ];

  return (
    <AIPageShell
      title="Command Center"
      description="Start here to see what is ready, what needs human attention, and which steps are still missing before teams can use the module confidently."
      actions={
        <>
          <AIActionLink href="/ai/workflows/new" label="New Automation" />
          <AIActionLink href="/ai/inbox" label="Open Tasks" variant="outline" />
          <AIActionLink href="/ai/assistants" label="Open Assistants" variant="outline" />
          <Button variant="outline" disabled>
            Export Report
          </Button>
        </>
      }
    >
      <AIStatGrid items={items} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AIOnboardingChecklist items={onboardingItems} />

        <div className="space-y-6">

          <AISectionCard
            title="What this workspace does"
            description="Plain-language guide for the current user's focus."
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Primary focus</p>
                <p className="mt-2 text-sm text-slate-600">
                  {data.roleFocus.description}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">What to do next</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>1. Complete the checklist if setup is incomplete.</p>
                  <p>2. Open Tasks to clear pending approvals or failed automations.</p>
                  <p>3. Open Assistants to confirm each module has usable guided help.</p>
                </div>
              </div>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/ai/tasks">
                  Open the task view
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </AISectionCard>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <AISectionCard title="Needs attention" description="Important alerts and exceptions that business users should see first.">
          {data.alerts.length === 0 ? (
            <AIEmptyState
              title="No active alerts"
              description="There are no current AI or automation issues that need attention."
            />
          ) : (
            <div className="space-y-3">
              {data.alerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{alert.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
                    </div>
                    <AIStatusBadge status={alert.severity} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(alert.createdAt))}</p>
                </div>
              ))}
            </div>
          )}
        </AISectionCard>

        <AISectionCard title="Assistant readiness" description="Which business modules already have guided help ready to use.">
          <div className="space-y-3">
            {data.assistantReadiness.map((row) => (
              <div key={row.module} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">{getModuleLabel(row.module)}</p>
                    <p className="text-sm text-slate-600">{row.description}</p>
                  </div>
                  <AIStatusBadge status={row.status} />
                </div>
              </div>
            ))}
          </div>
        </AISectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AISectionCard title="Approval work" description="The most urgent approval items waiting for a decision.">
          {data.pendingApprovals.length === 0 ? (
            <AIEmptyState
              title="Approval queue is clear"
              description="There are no approval items waiting right now."
            />
          ) : (
            <div className="space-y-3">
              {data.pendingApprovals.slice(0, 4).map((approval) => (
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

        <AISectionCard title="Automation issues" description="Recent runs that could not complete and may need follow-up.">
          {data.failedRuns.length === 0 ? (
            <AIEmptyState
              title="No issues detected"
              description="Recent automation runs completed without recorded failures."
            />
          ) : (
            <div className="space-y-3">
              {data.failedRuns.slice(0, 4).map((run) => (
                <div key={run.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{run.workflowName}</p>
                      <p className="mt-1 text-sm text-slate-600">{run.error || 'The run did not complete.'}</p>
                    </div>
                    <AIStatusBadge status="Needs attention" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Last attempted {new Date(run.startedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </AISectionCard>
      </div>
    </AIPageShell>
  );
}
