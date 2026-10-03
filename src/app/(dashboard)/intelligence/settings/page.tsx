'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Save, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

type SettingsResponse = {
  success: boolean;
  data: {
    settings: {
      readinessThreshold: number;
      hardBlockBelowThreshold: boolean;
      minimumProfileConfidence: number;
      minimumRecommendationConfidence: number;
      freshnessHours: number;
      formulaVersion: string;
      approvalDelegationThresholdLkr: number;
      requireHumanReview: boolean;
      autoRunSnapshots: boolean;
      autoRunConstraintScan: boolean;
    };
  };
};

export default function IntelligenceSettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse['data']['settings'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadSettings() {
    const response = await fetch('/api/intelligence/settings');
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload?.error?.message || 'Failed to load intelligence settings.');
    }
    setSettings(payload.data.settings);
  }

  useEffect(() => {
    loadSettings()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/intelligence/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Failed to save intelligence settings.');
      }
      setSettings(payload.data.settings);
      setMessage('Intelligence settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save intelligence settings.');
    } finally {
      setSaving(false);
    }
  }

  async function restoreDefaults() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/intelligence/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore_defaults' }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Failed to restore default settings.');
      }
      setSettings(payload.data.settings);
      setMessage('Default intelligence settings restored.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore default settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">Loading intelligence settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return <div className="p-8 text-sm text-slate-600">Settings are unavailable.</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Intelligence Settings</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Tune the thresholds and governance rules that control when the intelligence layer is allowed to speak confidently.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => loadSettings().catch((err) => setError(err.message))}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
          </Button>
          <Button variant="outline" onClick={restoreDefaults} disabled={saving}>
            <Settings2 className="mr-2 h-4 w-4" />
            Restore Defaults
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Formula version</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{settings.formulaVersion}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Freshness SLA</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{settings.freshnessHours}h</p>
          </div>
          <div className="flex items-end justify-start md:justify-end">
            <Badge variant="outline">{settings.requireHumanReview ? 'Human review required' : 'Advisory only'}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Readiness Gate</CardTitle>
            <CardDescription>Control when intelligence pages unlock and how strict the system should be.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Minimum readiness score</Label>
                <Badge variant="outline">{settings.readinessThreshold}%</Badge>
              </div>
              <Slider
                min={60}
                max={95}
                step={1}
                value={[settings.readinessThreshold]}
                onValueChange={(value) => setSettings((current) => current ? { ...current, readinessThreshold: value[0] } : current)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Hard block below readiness threshold</Label>
                  <p className="mt-1 text-sm text-slate-500">When enabled, pages stay gated instead of showing weak-confidence outputs.</p>
                </div>
                <Switch
                  checked={settings.hardBlockBelowThreshold}
                  onCheckedChange={(checked) => setSettings((current) => current ? { ...current, hardBlockBelowThreshold: checked } : current)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Freshness window</Label>
                <Badge variant="outline">{settings.freshnessHours} hours</Badge>
              </div>
              <Slider
                min={4}
                max={72}
                step={4}
                value={[settings.freshnessHours]}
                onValueChange={(value) => setSettings((current) => current ? { ...current, freshnessHours: value[0] } : current)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Confidence Controls</CardTitle>
            <CardDescription>Define how much data quality is required before profiles and recommendations appear strong enough to trust.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Minimum profile confidence</Label>
                <Badge variant="outline">{settings.minimumProfileConfidence}%</Badge>
              </div>
              <Slider
                min={30}
                max={95}
                step={1}
                value={[settings.minimumProfileConfidence]}
                onValueChange={(value) => setSettings((current) => current ? { ...current, minimumProfileConfidence: value[0] } : current)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Minimum recommendation confidence</Label>
                <Badge variant="outline">{settings.minimumRecommendationConfidence}%</Badge>
              </div>
              <Slider
                min={30}
                max={95}
                step={1}
                value={[settings.minimumRecommendationConfidence]}
                onValueChange={(value) => setSettings((current) => current ? { ...current, minimumRecommendationConfidence: value[0] } : current)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Workflow Governance</CardTitle>
            <CardDescription>Keep the AI layer explainable and prevent it from quietly turning into automation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require human review for recommendations</Label>
                <p className="mt-1 text-sm text-slate-500">Accepted or implemented states should come from a person with authority.</p>
              </div>
              <Switch
                checked={settings.requireHumanReview}
                onCheckedChange={(checked) => setSettings((current) => current ? { ...current, requireHumanReview: checked } : current)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-run workforce snapshots</Label>
                <p className="mt-1 text-sm text-slate-500">Reserve for cron-driven execution once event coverage is stable.</p>
              </div>
              <Switch
                checked={settings.autoRunSnapshots}
                onCheckedChange={(checked) => setSettings((current) => current ? { ...current, autoRunSnapshots: checked } : current)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-run constraint scanning</Label>
                <p className="mt-1 text-sm text-slate-500">Keep this off until the event ledger is consistently populated.</p>
              </div>
              <Switch
                checked={settings.autoRunConstraintScan}
                onCheckedChange={(checked) => setSettings((current) => current ? { ...current, autoRunConstraintScan: checked } : current)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Policy Defaults</CardTitle>
            <CardDescription>Recommended starting values for delegation and review behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Approval delegation threshold</Label>
                <Badge variant="outline">LKR {settings.approvalDelegationThresholdLkr.toLocaleString()}</Badge>
              </div>
              <Slider
                min={25000}
                max={1000000}
                step={25000}
                value={[settings.approvalDelegationThresholdLkr]}
                onValueChange={(value) => setSettings((current) => current ? { ...current, approvalDelegationThresholdLkr: value[0] } : current)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
