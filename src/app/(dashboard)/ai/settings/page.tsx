import { AISettingsForm } from '@/components/ai/ai-settings-form';
import { AIPageShell, AISectionCard, AIStatusBadge } from '@/components/ai/ai-primitives';
import { AIAdminSummaryStrip } from '@/components/ai/ai-admin-summary-strip';
import { getAISettings, runDiagnostics } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export default async function AISettingsPage() {
  const { tenantId } = await requireAIAccess('edit');
  const [settings, diagnostics] = await Promise.all([getAISettings(tenantId), runDiagnostics(tenantId)]);

  return (
    <AIPageShell
      title="Settings"
      description="Tenant-wide defaults for retention, notifications, policy routing, and diagnostics."
    >
      <AIAdminSummaryStrip
        title="Tenant defaults, retries, notifications, and diagnostics"
        audience="AI admins"
        readiness="Configured per tenant"
        description="These settings control the overall behavior of the AI workspace rather than any single automation."
      />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AISectionCard title="Module Settings" description="Save tenant-scoped control-plane defaults.">
          <AISettingsForm settings={settings} />
        </AISectionCard>
        <AISectionCard title="Diagnostics" description="Operational checks for the control plane.">
          <div className="space-y-3">
            {diagnostics.map((check) => (
              <div key={check.label} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{check.label}</p>
                    <p className="text-sm text-slate-600">{check.detail}</p>
                  </div>
                  <AIStatusBadge status={check.status} />
                </div>
              </div>
            ))}
          </div>
        </AISectionCard>
      </div>
    </AIPageShell>
  );
}
