import { AIEmptyState, AIPageShell, AISectionCard, AIStatGrid } from '@/components/ai/ai-primitives';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAnalyticsData } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIAnalyticsPage() {
  const { tenantId } = await requireAIAccess('view');
  const analytics = await getAnalyticsData(tenantId);

  return (
    <AIPageShell
      title="Analytics"
      description="Outcome tracking for workflow reliability, approvals, agents, and model spend."
    >
      <AIStatGrid items={analytics.kpis.map((item, index) => ({
        label: item.label,
        value: item.value,
        hint: item.trend,
        tone: index % 2 === 0 ? 'sky' : 'slate',
      }))} />
      <AISectionCard title="Throughput" description="Recent execution and approval activity.">
        {analytics.throughput.every((row) => row.runs === 0 && row.approvals === 0) ? (
          <AIEmptyState
            title="No workflow activity yet"
            description="Throughput will appear once this tenant records workflow runs or approval items."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Approvals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.throughput.map((row) => (
                <TableRow key={row.period}>
                  <TableCell>{row.period}</TableCell>
                  <TableCell>{row.runs}</TableCell>
                  <TableCell>{row.approvals}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AISectionCard>
      <div className="grid gap-6 xl:grid-cols-2">
        <AISectionCard title="Queue Health" description="Retry posture and dead-letter exposure for the durable runtime.">
          <AIStatGrid
            items={[
              {
                label: 'Pending Queue',
                value: String(analytics.queueHealth.pending),
                hint: 'Queued workflow executions',
                tone: 'sky',
              },
              {
                label: 'Retrying',
                value: String(analytics.queueHealth.retrying),
                hint: 'Executions waiting for another attempt',
                tone: 'amber',
              },
              {
                label: 'Dead Letter',
                value: String(analytics.queueHealth.deadLetters),
                hint: 'Runs that exhausted retry policy',
                tone: 'amber',
              },
              {
                label: 'Avg Attempts',
                value: analytics.queueHealth.averageAttempts,
                hint: 'Average attempts across queued items',
                tone: 'slate',
              },
            ]}
          />
        </AISectionCard>
        <AISectionCard title="Predictive Signals" description="Heuristic recommendations derived from live tenant data across modules.">
          {analytics.predictions.length === 0 ? (
            <AIEmptyState
              title="No predictive signals yet"
              description="Predictions will appear here as business activity accumulates."
            />
          ) : (
            <div className="space-y-3">
              {analytics.predictions.map((prediction) => (
                <div key={prediction.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{prediction.title}</p>
                      <p className="text-sm text-slate-600">{prediction.summary}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{prediction.score}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{prediction.severity}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{prediction.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </AISectionCard>
      </div>
    </AIPageShell>
  );
}
