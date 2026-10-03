import { AIActionLink, AIPageShell, AISectionCard, AIStatGrid } from '@/components/ai/ai-primitives';
import { getAnalyticsData, listAuditTrail } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AIInsightsPage() {
  const { tenantId } = await requireAIAccess('view');
  const [analytics, audit] = await Promise.all([getAnalyticsData(tenantId), listAuditTrail(tenantId)]);

  return (
    <AIPageShell
      title="Insights"
      description="Use this space to understand operational impact, risk trends, and what evidence exists for review."
      actions={
        <>
          <AIActionLink href="/ai/analytics" label="Open Analytics" />
          <AIActionLink href="/ai/audit" label="Open Audit" variant="outline" />
        </>
      }
    >
      <AIStatGrid
        items={[
          {
            label: 'Approvals processed',
            value: analytics.kpis.find((item) => item.label.toLowerCase().includes('approval'))?.value || '0',
            hint: 'Recent approval activity',
            tone: 'sky',
          },
          {
            label: 'Queue pressure',
            value: String(analytics.queueHealth.pending + analytics.queueHealth.retrying),
            hint: 'Pending or retrying workflow runs',
            tone: 'amber',
          },
          {
            label: 'Audit records',
            value: String(audit.length),
            hint: 'Evidence entries currently available',
            tone: 'slate',
          },
          {
            label: 'Predictive signals',
            value: String(analytics.predictions.length),
            hint: 'Signals requiring business review',
            tone: 'emerald',
          },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <AISectionCard title="Operational insight" description="The most important trends surfaced by the analytics layer.">
          <div className="space-y-3">
            {analytics.predictions.slice(0, 4).map((prediction) => (
              <div key={prediction.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-medium text-slate-900">{prediction.title}</p>
                <p className="mt-1 text-sm text-slate-600">{prediction.summary}</p>
                <p className="mt-2 text-sm text-slate-700">{prediction.recommendation}</p>
              </div>
            ))}
            {analytics.predictions.length === 0 ? (
              <p className="text-sm text-slate-600">No predictive signals are available yet for this tenant.</p>
            ) : null}
          </div>
        </AISectionCard>
        <AISectionCard title="Audit readiness" description="A quick view of whether evidence is available for compliance or investigation.">
          <div className="space-y-3">
            {audit.slice(0, 5).map((record) => (
              <div key={record.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-medium text-slate-900">{record.action}</p>
                <p className="mt-1 text-sm text-slate-600">{record.summary}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(record.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {audit.length === 0 ? (
              <p className="text-sm text-slate-600">No audit records are available yet. Create activity first, then come back here.</p>
            ) : null}
          </div>
        </AISectionCard>
      </div>
    </AIPageShell>
  );
}
