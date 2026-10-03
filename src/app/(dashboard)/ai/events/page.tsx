import { AIEmptyState, AIPageShell, AISectionCard, AIStatusBadge } from '@/components/ai/ai-primitives';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listDomainEvents } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIEventsPage() {
  const { tenantId } = await requireAIAccess('view');
  const events = await listDomainEvents(tenantId);

  return (
    <AIPageShell
      title="Events"
      description="Canonical event stream for AI and workflow orchestration, scoped to the current tenant."
    >
      <AISectionCard title="Event Observability" description="Recent normalized domain events flowing into the control plane.">
        {events.length === 0 ? (
          <AIEmptyState
            title="No events observed"
            description="The AI event bus has not received any tenant-scoped events yet."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Occurred</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="capitalize">{event.module}</TableCell>
                  <TableCell>{event.event}</TableCell>
                  <TableCell>{event.entity}</TableCell>
                  <TableCell>
                    <AIStatusBadge status={event.status} />
                  </TableCell>
                  <TableCell>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.occurredAt))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AISectionCard>
    </AIPageShell>
  );
}
