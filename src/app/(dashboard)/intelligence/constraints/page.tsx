'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Filter,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfidenceBadge } from '@/components/intelligence/confidence-badge';
import { DataFreshnessStamp } from '@/components/intelligence/data-freshness-stamp';
import { SeverityTracker } from '@/components/intelligence/severity-tracker';

type Constraint = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  severity: number;
  confidence: number;
  status: string;
  linkedEmployeeId: string | null;
  linkedDepartmentId: string | null;
  linkedProcessKey: string | null;
  evidence: Record<string, unknown> | null;
  detectedAt: string;
};

type ConstraintResponse = {
  success: boolean;
  data: {
    constraints: Constraint[];
    recentEvents: Array<{
      id: string;
      moduleKey: string;
      entityType: string;
      action: string;
      occurredAt: string;
      metadata: Record<string, unknown> | null;
    }>;
  };
};

const FILTERS = ['ALL', 'HUMAN', 'PROCESS', 'SKILL', 'DECISION', 'OPERATIONAL'];

function typeTone(type: string) {
  if (type === 'HUMAN') return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
  if (type === 'PROCESS') return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
  if (type === 'DECISION') return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
  if (type === 'SKILL') return 'bg-violet-100 text-violet-700 hover:bg-violet-100';
  return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function IntelligenceConstraintsPage() {
  const [data, setData] = useState<ConstraintResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('ALL');

  async function loadConstraints() {
    const response = await fetch('/api/intelligence/constraints');
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload?.error?.message || 'Failed to load constraints.');
    }
    setData(payload.data);
  }

  useEffect(() => {
    loadConstraints()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function runScan() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/intelligence/constraints/run', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Failed to run constraint scan.');
      }
      await loadConstraints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run constraint scan.');
    } finally {
      setRunning(false);
    }
  }

  const constraints = useMemo(() => {
    if (!data?.constraints) return [];
    if (activeFilter === 'ALL') return data.constraints;
    return data.constraints.filter((constraint) => constraint.type === activeFilter);
  }, [data, activeFilter]);

  const summary = useMemo(() => {
    const source = data?.constraints ?? [];
    return {
      total: source.length,
      critical: source.filter((constraint) => constraint.severity >= 80).length,
      averageConfidence:
        source.length > 0
          ? Math.round((source.reduce((sum, constraint) => sum + constraint.confidence, 0) / source.length) * 10) / 10
          : 0,
      latestDetectedAt: source[0]?.detectedAt ?? null,
    };
  }, [data]);
  const totalConstraints = summary.total;
  const criticalConstraints = summary.critical;
  const averageConfidence = summary.averageConfidence;

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">Loading constraint log...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Constraint Log</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            The scanner turns Workforce DNA and recent operational signals into the first evidence-backed bottleneck register.
          </p>
        </div>
        <Button onClick={runScan} disabled={running}>
          {running ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {running ? 'Scanning Constraints' : 'Run Constraint Scan'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="grid gap-4 p-6 md:grid-cols-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Detected constraints</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{totalConstraints}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Critical severity</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{criticalConstraints}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Average confidence</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{averageConfidence}%</p>
          </div>
          <div className="flex items-end justify-start md:justify-end">
            <DataFreshnessStamp value={summary.latestDetectedAt} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            variant={activeFilter === filter ? 'default' : 'outline'}
            onClick={() => setActiveFilter(filter)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {filter}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {constraints.length === 0 ? (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <Target className="h-10 w-10 text-slate-400" />
                <p className="font-medium text-slate-900">No constraints matched the current filter.</p>
                <p className="text-sm text-slate-500">Run the scan again after new events and workforce snapshots land.</p>
              </CardContent>
            </Card>
          ) : (
            constraints.map((constraint) => (
              <Card key={constraint.id} className="border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={typeTone(constraint.type)}>{constraint.type}</Badge>
                        <ConfidenceBadge value={constraint.confidence} />
                      </div>
                      <CardTitle className="text-lg">{constraint.name}</CardTitle>
                      <CardDescription>{constraint.description}</CardDescription>
                    </div>
                    <ShieldAlert className="h-6 w-6 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SeverityTracker value={constraint.severity} />

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Process key</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{constraint.linkedProcessKey ?? 'Not mapped'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Detected</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(constraint.detectedAt)}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-900">Evidence</p>
                    <pre className="overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-600">
                      {JSON.stringify(constraint.evidence ?? {}, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>TOC Playbook</CardTitle>
              <CardDescription>Default management sequence for active constraints.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-900">1. Identify</p>
                <p className="mt-1">Confirm the weakest point with evidence and confidence, not intuition.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-900">2. Exploit</p>
                <p className="mt-1">Protect the constraint from avoidable interruptions and reduce queue waste.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="font-medium text-slate-900">3. Elevate</p>
                <p className="mt-1">Add support, delegation, or structure only after the current limit is clear.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Recent Operational Events
              </CardTitle>
              <CardDescription>Latest ledger signals entering the intelligence layer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.recentEvents ?? []).map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{event.action}</p>
                      <p className="text-sm text-slate-600">{event.moduleKey} · {event.entityType}</p>
                    </div>
                    <Badge variant="outline">{formatDate(event.occurredAt)}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
