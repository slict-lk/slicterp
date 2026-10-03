import Link from 'next/link';
import { AIActionLink, AIEmptyState, AIPageShell, AISectionCard, AIStatusBadge } from '@/components/ai/ai-primitives';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listWorkflowRegistry } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIWorkflowsPage() {
  const { tenantId } = await requireAIAccess('view');
  const workflows = await listWorkflowRegistry(tenantId);

  return (
    <AIPageShell
      title="Workflows"
      description="Review every automation in one place, from guided business workflows to advanced technical definitions."
      actions={
        <>
          <AIActionLink href="/ai/workflows/new" label="New Automation" />
          <AIActionLink href="/ai/templates" label="Use Template" variant="outline" />
        </>
      }
    >
      <AISectionCard title="Automation list" description="Ownership, trigger, policy, and execution posture for all orchestration assets.">
        {workflows.length === 0 ? (
          <AIEmptyState
            title="No workflows available"
            description="Neither Studio workflows nor legacy automation rules exist for this tenant yet."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow key={`${workflow.source}-${workflow.id}`}>
                  <TableCell>
                    <div>
                      <Link
                        href={workflow.source === 'legacy-rule' ? `/studio/automation/${workflow.id}` : `/ai/workflows/${workflow.id}`}
                        className="font-medium text-slate-900 hover:text-sky-700"
                      >
                        {workflow.name}
                      </Link>
                      <p className="text-sm text-slate-600">{workflow.description}</p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{workflow.source.replaceAll('-', ' ')}</TableCell>
                  <TableCell>{workflow.trigger}</TableCell>
                  <TableCell className="capitalize">{workflow.module}</TableCell>
                  <TableCell>
                    <AIStatusBadge status={workflow.status} />
                  </TableCell>
                  <TableCell>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(workflow.updatedAt))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AISectionCard>
    </AIPageShell>
  );
}
