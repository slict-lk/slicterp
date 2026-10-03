import { notFound } from 'next/navigation';
import { AIMetaList, AIPageShell, AISectionCard, AIStatusBadge } from '@/components/ai/ai-primitives';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAgentDetail } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await requireAIAccess('view');
  const { id } = await params;
  const detail = await getAgentDetail(tenantId, id);

  if (!detail) {
    notFound();
  }

  const tools = Array.isArray(detail.agent.config?.allowedTools) ? detail.agent.config.allowedTools : [];

  return (
    <AIPageShell
      title={detail.agent.name}
      description="Versioned agent profile, runtime performance, and operator safety context."
    >
      <AIMetaList
        items={[
          { label: 'Type', value: String(detail.agent.type) },
          { label: 'Status', value: <AIStatusBadge status={detail.agent.isActive ? 'active' : 'paused'} /> },
          { label: 'Tasks Completed', value: String(detail.agent.tasksCompleted || 0) },
          { label: 'Success Rate', value: `${detail.agent.successRate || 0}%` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <AISectionCard title="Guardrails" description="Configured tool access and escalation path.">
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Allowed tools</p>
              <p className="mt-2 text-sm text-slate-600">{tools.length > 0 ? tools.join(', ') : 'No explicit tools configured'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Escalation policy</p>
              <p className="mt-2 text-sm text-slate-600">{String(detail.agent.config?.escalationPolicy || 'approval_gate')}</p>
            </div>
          </div>
        </AISectionCard>

        <AISectionCard title="Execution History" description="Recent agent runs.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.executions.map((execution: any) => (
                <TableRow key={execution.id}>
                  <TableCell>
                    <AIStatusBadge status={execution.status} />
                  </TableCell>
                  <TableCell>{new Date(execution.startedAt).toLocaleString()}</TableCell>
                  <TableCell>{execution.completedAt ? new Date(execution.completedAt).toLocaleString() : 'Running'}</TableCell>
                  <TableCell>{execution.error || 'None'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AISectionCard>
      </div>
    </AIPageShell>
  );
}

