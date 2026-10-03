'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  ListChecks,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ReadinessAudit = {
  id?: string;
  auditId?: string;
  score?: number;
  dataReadinessIndex?: number;
  status?: string;
  activationGate?: 'PASS' | 'BLOCKED';
  domains?: Record<string, number>;
  details?: Record<string, number>;
  warnings?: string[];
  actionItems?: string[];
  createdAt?: string;
};

type ReadinessResponse = {
  success: boolean;
  data: {
    tenant: {
      id: string;
      name: string;
      subdomain: string;
    };
    latest: ReadinessAudit | null;
    history: ReadinessAudit[];
  };
};

function getScore(audit: ReadinessAudit | null) {
  return audit?.score ?? audit?.dataReadinessIndex ?? 0;
}

function getStatus(audit: ReadinessAudit | null) {
  return audit?.status ?? audit?.activationGate ?? 'NOT_RUN';
}

function formatDate(value?: string | null) {
  if (!value) return 'Not run yet';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function domainLabel(key: string) {
  const labels: Record<string, string> = {
    hrStructure: 'HR Directory Structure',
    attendance: 'Attendance Telemetry',
    tasks: 'Task Metrics',
    operations: 'Operational Trails',
  };
  return labels[key] ?? key;
}

function DomainIcon({ domain }: { domain: string }) {
  if (domain === 'hrStructure') return <Users className="h-5 w-5" />;
  if (domain === 'attendance') return <Clock className="h-5 w-5" />;
  if (domain === 'tasks') return <ListChecks className="h-5 w-5" />;
  return <Database className="h-5 w-5" />;
}

export default function IntelligenceReadinessPage() {
  const [data, setData] = useState<ReadinessResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReadiness() {
    setError(null);
    const response = await fetch('/api/intelligence/readiness');
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload?.error?.message || 'Failed to load readiness data.');
    }
    setData(payload.data);
  }

  useEffect(() => {
    loadReadiness()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function runAudit() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/intelligence/readiness/run', {
        method: 'POST',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Failed to run readiness audit.');
      }
      await loadReadiness();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run readiness audit.');
    } finally {
      setRunning(false);
    }
  }

  const latest = data?.latest ?? null;
  const score = getScore(latest);
  const status = getStatus(latest);
  const isPass = status === 'PASS';
  const domains = latest?.domains ?? {};
  const warnings = latest?.warnings ?? [];
  const actionItems = latest?.actionItems ?? [];

  const meterStyle = useMemo(() => {
    const clamped = Math.max(0, Math.min(100, score));
    return {
      background: `conic-gradient(${isPass ? '#059669' : '#dc2626'} ${clamped * 3.6}deg, #e2e8f0 0deg)`,
    };
  }, [score, isPass]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">Loading readiness gate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Data Gate & Verification</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            This page decides whether the tenant has enough clean data for workforce intelligence, TOC constraints, simulations, and AI recommendations.
          </p>
        </div>
        <Button onClick={runAudit} disabled={running}>
          {running ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
          {running ? 'Running Audit' : 'Run Database Audit'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Diagnostic Meter</CardTitle>
                <CardDescription>80% minimum required to unlock intelligence outputs.</CardDescription>
              </div>
              <Badge className={isPass ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-100'}>
                {status === 'NOT_RUN' ? 'NOT RUN' : status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-5">
              <div className="flex h-56 w-56 items-center justify-center rounded-full p-4" style={meterStyle}>
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-5xl font-bold tracking-tight text-slate-950">{score.toFixed(1)}%</span>
                  <span className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">DRI Score</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-900">
                  {isPass ? 'Gate passed' : 'Gate blocked'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Last audit: {formatDate(latest?.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {['hrStructure', 'attendance', 'tasks', 'operations'].map((domain) => {
            const value = domains[domain] ?? 0;
            const domainPass = value >= 80;
            return (
              <Card key={domain} className="border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className={domainPass ? 'rounded-lg bg-emerald-50 p-2 text-emerald-600' : 'rounded-lg bg-amber-50 p-2 text-amber-600'}>
                      <DomainIcon domain={domain} />
                    </div>
                    <Badge variant="outline">{domainPass ? 'Healthy' : 'Needs cleanup'}</Badge>
                  </div>
                  <CardTitle className="text-base">{domainLabel(domain)}</CardTitle>
                  <CardDescription>Freshness and completeness check</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-950">{value.toFixed(0)}%</div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div
                      className={domainPass ? 'h-2 rounded-full bg-emerald-600' : 'h-2 rounded-full bg-amber-500'}
                      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-blue-600" />
              Data Cleanup Checklist
            </CardTitle>
            <CardDescription>
              These items must be resolved before the platform can safely increase intelligence confidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {actionItems.length === 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="font-medium">No cleanup actions detected.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {actionItems.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-500">
                      {index + 1}
                    </div>
                    <p className="text-sm text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Warning Flags
            </CardTitle>
            <CardDescription>Signals that reduce score confidence.</CardDescription>
          </CardHeader>
          <CardContent>
            {warnings.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No warning flags from the latest audit.
              </p>
            ) : (
              <div className="space-y-3">
                {warnings.map((warning) => (
                  <div key={warning} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Audit History
          </CardTitle>
          <CardDescription>Recent readiness snapshots for this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.history?.length ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No audit history yet. Run the first database audit to create a baseline.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Warnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.history.map((audit) => (
                    <tr key={audit.id ?? audit.auditId}>
                      <td className="px-4 py-3 text-slate-700">{formatDate(audit.createdAt)}</td>
                      <td className="px-4 py-3 font-medium text-slate-950">{getScore(audit).toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{getStatus(audit)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{audit.warnings?.length ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
