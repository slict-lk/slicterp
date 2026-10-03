"use client";

import { useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { AIFormSection } from '@/components/ai/ai-primitives';
import { toast } from 'sonner';
import type { AIControlPlaneSettings } from '@/lib/ai/control-plane-types';

export function AISettingsForm({ settings }: { settings: AIControlPlaneSettings }) {
  const router = useRouter();
    const [retentionDays, setRetentionDays] = useState(String(settings.retentionDays));
  const [alertChannels, setAlertChannels] = useState(settings.alertChannels.join(', '));
  const [defaultPolicyProfileId, setDefaultPolicyProfileId] = useState(settings.defaultPolicyProfileId);
  const [brandingTone, setBrandingTone] = useState(settings.brandingTone);
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(settings.diagnosticsEnabled);
  const [defaultApproverChain, setDefaultApproverChain] = useState(
    settings.defaultApproverChain.join(', ')
  );
  const [maxExecutionAttempts, setMaxExecutionAttempts] = useState(
    String(settings.maxExecutionAttempts)
  );
  const [retryBackoffMinutes, setRetryBackoffMinutes] = useState(
    String(settings.retryBackoffMinutes)
  );
  const [escalationSlaMinutes, setEscalationSlaMinutes] = useState(
    String(settings.escalationSlaMinutes)
  );
  const [queuePollingIntervalSeconds, setQueuePollingIntervalSeconds] = useState(
    String(settings.queuePollingIntervalSeconds)
  );
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const numRetention = Number(retentionDays);
      const numMaxAttempts = Number(maxExecutionAttempts);
      const numBackoff = Number(retryBackoffMinutes);
      const numEscalation = Number(escalationSlaMinutes);
      const numPolling = Number(queuePollingIntervalSeconds);
      if ([numRetention, numMaxAttempts, numBackoff, numEscalation, numPolling].some(isNaN)) {
        throw new Error('Numeric fields must contain valid numbers');
      }

      const response = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retentionDays: numRetention,
          alertChannels: alertChannels
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          defaultPolicyProfileId,
          brandingTone,
          diagnosticsEnabled,
          defaultApproverChain: defaultApproverChain
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          maxExecutionAttempts: numMaxAttempts,
          retryBackoffMinutes: numBackoff,
          escalationSlaMinutes: numEscalation,
          queuePollingIntervalSeconds: numPolling,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Failed to update settings' }));
        throw new Error(body.error || 'Failed to update settings');
      }

      startTransition(() => {
        router.refresh();
      });
      toast.success('Settings updated');
    } catch (submitError: any) {
      setError(submitError.message || 'Failed to update settings');
    } finally {
      setSubmitting(false);
    }
  };

  const restoreDefaults = async () => {
    setRestoring(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore_defaults' }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Failed to restore defaults' }));
        throw new Error(body.error || 'Failed to restore defaults');
      }

      const restored = (await response.json()) as AIControlPlaneSettings;
      setRetentionDays(String(restored.retentionDays));
      setAlertChannels(restored.alertChannels.join(', '));
      setDefaultPolicyProfileId(restored.defaultPolicyProfileId);
      setBrandingTone(restored.brandingTone);
      setDiagnosticsEnabled(restored.diagnosticsEnabled);
      setDefaultApproverChain(restored.defaultApproverChain.join(', '));
      setMaxExecutionAttempts(String(restored.maxExecutionAttempts));
      setRetryBackoffMinutes(String(restored.retryBackoffMinutes));
      setEscalationSlaMinutes(String(restored.escalationSlaMinutes));
      setQueuePollingIntervalSeconds(String(restored.queuePollingIntervalSeconds));
      toast.success('Defaults restored');
      startTransition(() => {
        router.refresh();
      });
    } catch (restoreError: any) {
      setError(restoreError.message || 'Failed to restore defaults');
    } finally {
      setRestoring(false);
    }
  };

  const sendTestAlert = async () => {
    setSendingAlert(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_test_alert' }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Failed to send test alert' }));
        throw new Error(body.error || 'Failed to send test alert');
      }

      toast.success('Test alert created');
      startTransition(() => {
        router.refresh();
      });
    } catch (alertError: any) {
      setError(alertError.message || 'Failed to send test alert');
    } finally {
      setSendingAlert(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <AIFormSection
        title="Retention and Routing"
        description="Tune how long evidence is retained and which policy profile is used by default."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="retention-days">Retention days</Label>
            <Input
              id="retention-days"
              value={retentionDays}
              onChange={(event) => setRetentionDays(event.target.value)}
              type="number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-policy">Default policy profile</Label>
            <Input
              id="default-policy"
              value={defaultPolicyProfileId}
              onChange={(event) => setDefaultPolicyProfileId(event.target.value)}
            />
          </div>
        </div>
      </AIFormSection>

      <AIFormSection
        title="Operator Experience"
        description="Define notification channels and the tone expected in the operator workspace."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branding-tone">Branding tone</Label>
            <Input
              id="branding-tone"
              value={brandingTone}
              onChange={(event) => setBrandingTone(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alert-channels">Alert channels</Label>
            <Textarea
              id="alert-channels"
              value={alertChannels}
              onChange={(event) => setAlertChannels(event.target.value)}
              className="min-h-[110px]"
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Diagnostics enabled</p>
            <p className="text-xs text-slate-500">Allow operational health checks to surface in the settings pane.</p>
          </div>
          <Switch checked={diagnosticsEnabled} onCheckedChange={setDiagnosticsEnabled} />
        </div>
      </AIFormSection>

      <AIFormSection
        title="Queue and Escalation"
        description="Tune retry posture, polling cadence, and approval assignment defaults."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="default-approver-chain">Default approver chain</Label>
            <Textarea
              id="default-approver-chain"
              value={defaultApproverChain}
              onChange={(event) => setDefaultApproverChain(event.target.value)}
              className="min-h-[90px]"
            />
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-execution-attempts">Max execution attempts</Label>
              <Input
                id="max-execution-attempts"
                type="number"
                value={maxExecutionAttempts}
                onChange={(event) => setMaxExecutionAttempts(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retry-backoff-minutes">Retry backoff minutes</Label>
              <Input
                id="retry-backoff-minutes"
                type="number"
                value={retryBackoffMinutes}
                onChange={(event) => setRetryBackoffMinutes(event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="escalation-sla-minutes">Escalation SLA minutes</Label>
            <Input
              id="escalation-sla-minutes"
              type="number"
              value={escalationSlaMinutes}
              onChange={(event) => setEscalationSlaMinutes(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="queue-polling-interval">Queue polling interval seconds</Label>
            <Input
              id="queue-polling-interval"
              type="number"
              value={queuePollingIntervalSeconds}
              onChange={(event) => setQueuePollingIntervalSeconds(event.target.value)}
            />
          </div>
        </div>
      </AIFormSection>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={submitting || restoring || sendingAlert}>
          {submitting ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button type="button" variant="outline" onClick={restoreDefaults} disabled={restoring || submitting || sendingAlert}>
          {restoring ? 'Restoring...' : 'Restore Defaults'}
        </Button>
        <Button type="button" variant="outline" onClick={sendTestAlert} disabled={sendingAlert || submitting || restoring}>
          {sendingAlert ? 'Sending...' : 'Send Test Alert'}
        </Button>
      </div>
    </form>
  );
}
