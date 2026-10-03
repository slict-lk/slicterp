import { AIPageShell, AISectionCard, AIStatusBadge } from '@/components/ai/ai-primitives';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listAuditTrail } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIAuditPage() {
  const { tenantId } = await requireAIAccess('view');
  const records = await listAuditTrail(tenantId);

  return (
    <AIPageShell
      title="Audit"
      description="Immutable control-plane evidence for approvals, events, and adapter execution."
      actions={
        <Button asChild variant="outline">
          <a href="/api/ai/audit/bundle">Export Audit Pack</a>
        </Button>
      }
    >
      <AISectionCard title="Audit Trail" description="Recent evidence records written by the control plane.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Integration</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.integration}</TableCell>
                <TableCell>{record.action}</TableCell>
                <TableCell>
                  <AIStatusBadge status={record.status} />
                </TableCell>
                <TableCell>{new Date(record.createdAt).toLocaleString()}</TableCell>
                <TableCell>{record.summary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AISectionCard>
    </AIPageShell>
  );
}
