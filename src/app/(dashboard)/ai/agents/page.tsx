import Link from 'next/link';
import { AIActionLink, AIEmptyState, AIPageShell, AISectionCard, AIStatusBadge } from '@/components/ai/ai-primitives';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listAgents } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIAgentsPage() {
  const { tenantId } = await requireAIAccess('view');
  const agents = await listAgents(tenantId);

  return (
    <AIPageShell
      title="Agents"
      description="Directory of cross-module agents, their assigned model routes, and runtime posture."
      actions={<AIActionLink href="/ai/agents/new" label="New Agent" />}
    >
      <AISectionCard title="Agent Registry" description="Operational agents with tenant-scoped governance.">
        {agents.length === 0 ? (
          <AIEmptyState
            title="No agents configured"
            description="Create an agent when tenant workflows need a governed AI operator."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div>
                      <Link href={`/ai/agents/${agent.id}`} className="font-medium text-slate-900 hover:text-sky-700">
                        {agent.name}
                      </Link>
                      <p className="text-sm text-slate-600">{agent.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>{agent.type}</TableCell>
                  <TableCell>{agent.modelLabel}</TableCell>
                  <TableCell>{agent.tasksCompleted}</TableCell>
                  <TableCell>
                    <AIStatusBadge status={agent.active ? 'active' : 'paused'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AISectionCard>
    </AIPageShell>
  );
}
