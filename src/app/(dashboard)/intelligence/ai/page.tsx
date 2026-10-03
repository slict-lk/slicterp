'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IntelligenceAIOutputCard } from '@/components/intelligence/intelligence-ai-output-card';
import { ModuleCopilotPanel } from '@/components/ai/module-copilot-panel';

type ContextPayload = {
  success: boolean;
  data: {
    context: {
      gated: boolean;
      readiness: { status: string; score: number };
      workforce: { summary: { employeeCount: number; averageConfidence: number; averageStressLoad: number } };
      constraints: { count: number };
      recommendations: { count: number };
      suggestedPrompts: string[];
    };
    summary: {
      headline: string;
      gated: boolean;
      content: string;
      confidence: number;
      freshness: { workforce: string | null };
      sourceSections: string[];
      warnings: string[];
    };
  };
};

type RuntimePayload = {
  success: boolean;
  data: {
    autoRunSnapshots: boolean;
    autoRunConstraintScan: boolean;
    freshnessHours: number;
    lastRunAt: string | null;
    lastRunStatus: 'IDLE' | 'SUCCESS' | 'FAILED';
    lastRunMessage: string | null;
    lastSnapshotCount: number;
    lastConstraintCount: number;
    briefings: Array<{
      audience: 'CEO' | 'HR' | 'OPERATIONS';
      content: string;
      confidence: number;
      createdAt: string;
      gated: boolean;
    }>;
  };
};

const links = [
  { href: '/intelligence/ai/briefings', label: 'Briefings' },
  { href: '/intelligence/ai/explanations', label: 'Explanations' },
  { href: '/intelligence/ai/chat', label: 'AI Chat' },
  { href: '/intelligence/ai/audit', label: 'AI Audit' },
];

export default function IntelligenceAICommandCenterPage() {
  const [data, setData] = useState<ContextPayload['data'] | null>(null);
  const [runtime, setRuntime] = useState<RuntimePayload['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [contextResponse, runtimeResponse] = await Promise.all([
      fetch('/api/intelligence/ai/context'),
      fetch('/api/intelligence/runtime'),
    ]);
    const contextPayload = await contextResponse.json();
    const runtimePayload = await runtimeResponse.json();
    if (!contextResponse.ok || !contextPayload.success) {
      throw new Error(contextPayload?.error?.message || 'Failed to load intelligence AI context.');
    }
    if (!runtimeResponse.ok || !runtimePayload.success) {
      throw new Error(runtimePayload?.error?.message || 'Failed to load intelligence runtime.');
    }
    setData(contextPayload.data);
    setRuntime(runtimePayload.data);
  }

  async function runPipeline() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/intelligence/runtime', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Failed to run intelligence pipeline.');
      }
      setRuntime(payload.data);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run intelligence pipeline.');
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="text-sm text-slate-500">Loading intelligence AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">AI Command Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            This is the AI explanation layer for readiness, workforce, constraints, TOC, and recommendations. It uses the same AI backend family as the rest of the platform, but stays grounded in intelligence data only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => load().catch((err) => setError(err.message))}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={runPipeline} disabled={running}>
            {running ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {running ? 'Running Pipeline' : 'Run Intelligence Pipeline'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="grid gap-4 p-6 md:grid-cols-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Readiness</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{data?.context.readiness.status ?? 'BLOCKED'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Profiles</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{data?.context.workforce.summary.employeeCount ?? 0}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Constraints</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{data?.context.constraints.count ?? 0}</p>
          </div>
          <div className="flex items-end justify-start md:justify-end">
            <Badge variant="outline">
              Average confidence {data?.context.workforce.summary.averageConfidence ?? 0}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Runtime Pipeline</CardTitle>
          <CardDescription>Operational automation status for snapshots, constraint scanning, and AI briefing refresh.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Last status</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{runtime?.lastRunStatus ?? 'IDLE'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Snapshots</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{runtime?.lastSnapshotCount ?? 0}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Constraints</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{runtime?.lastConstraintCount ?? 0}</p>
          </div>
          <div className="space-y-2">
            <Badge variant="outline">Auto snapshots: {runtime?.autoRunSnapshots ? 'On' : 'Off'}</Badge>
            <Badge variant="outline">Auto scan: {runtime?.autoRunConstraintScan ? 'On' : 'Off'}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <IntelligenceAIOutputCard
          title="Executive AI Summary"
          description={data?.summary.headline}
          content={data?.summary.content ?? 'No summary available.'}
          confidence={data?.summary.confidence}
          freshness={data?.summary.freshness.workforce}
          sourceSections={data?.summary.sourceSections}
          warnings={data?.summary.warnings}
        />

        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                AI Surfaces
              </CardTitle>
              <CardDescription>Dedicated intelligence AI experiences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                >
                  <span>{link.label}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Suggested prompts</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(data?.context.suggestedPrompts ?? []).map((prompt) => (
                <Badge key={prompt} variant="secondary">
                  {prompt}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {runtime?.briefings?.length ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {runtime.briefings.map((briefing) => (
            <IntelligenceAIOutputCard
              key={`${briefing.audience}-${briefing.createdAt}`}
              title={`${briefing.audience} runtime briefing`}
              content={briefing.content}
              confidence={briefing.confidence}
              freshness={briefing.createdAt}
              sourceSections={['runtime', 'briefings']}
              warnings={briefing.gated ? ['Briefing was generated in a gated state.'] : []}
            />
          ))}
        </div>
      ) : null}

      <ModuleCopilotPanel
        module="intelligence"
        title="Shared AI Copilot"
        description="This panel uses the same copilot backend family as the rest of the ERP, but it is grounded with organizational intelligence context."
        context={{
          readinessStatus: data?.context.readiness.status ?? 'BLOCKED',
          readinessScore: data?.context.readiness.score ?? 0,
          workforceProfiles: data?.context.workforce.summary.employeeCount ?? 0,
          activeConstraints: data?.context.constraints.count ?? 0,
          activeRecommendations: data?.context.recommendations.count ?? 0,
        }}
        suggestions={[
          'Summarize the current organizational risk picture',
          'Explain the primary bottleneck in simple words',
          'Draft an executive update from the current intelligence state',
        ]}
      />
    </div>
  );
}
