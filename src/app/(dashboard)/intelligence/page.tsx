import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  GitBranch,
  Shield,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { getLatestDataReadinessAudit } from '@/lib/intelligence/readiness/readiness-service';
import { getWorkforceDashboardData } from '@/lib/intelligence/workforce/capacity-service';
import { getActiveConstraints } from '@/lib/intelligence/constraints/constraint-service';

export const dynamic = 'force-dynamic';

function formatDate(value?: Date | string | null) {
  if (!value) return 'Not run yet';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function IntelligenceControlCenterPage() {
  const tenant = await getOrCreateDefaultTenant();
  const latest = await getLatestDataReadinessAudit(prisma, tenant.id);
  const score = latest?.score ?? 0;
  const isReady = latest?.status === 'PASS';
  let workforceSummary = null as Awaited<ReturnType<typeof getWorkforceDashboardData>>['summary'] | null;
  let activeConstraints = [] as Awaited<ReturnType<typeof getActiveConstraints>>;

  if (isReady) {
    try {
      const [workforce, constraints] = await Promise.all([
        getWorkforceDashboardData(prisma, tenant.id),
        getActiveConstraints(prisma, tenant.id),
      ]);
      workforceSummary = workforce.summary;
      activeConstraints = constraints;
    } catch (error) {
      console.error('Failed to hydrate intelligence control center metrics:', error);
    }
  }

  const tiles = [
    {
      title: 'Data Readiness',
      description: 'Verify whether this tenant has enough clean telemetry for decision intelligence.',
      href: '/intelligence/readiness',
      icon: Shield,
      status: latest ? latest.status : 'Not run',
    },
    {
      title: 'Workforce DNA',
      description: 'Capacity profiles, dependency concentration, stress load, and succession readiness.',
      href: '/intelligence/workforce',
      icon: Users,
      status: isReady ? `${workforceSummary?.employeeCount ?? 0} profiles` : 'Locked',
    },
    {
      title: 'Constraint Log',
      description: 'Human, process, decision, skill, system, and operational bottlenecks.',
      href: '/intelligence/constraints',
      icon: AlertTriangle,
      status: isReady ? `${activeConstraints.length} active` : 'Locked',
    },
    {
      title: 'TOC Workspace',
      description: 'Goal Trees, Current Reality Trees, and Future Reality Trees with evidence streams.',
      href: '/intelligence/toc',
      icon: GitBranch,
      status: isReady ? 'Planned' : 'Locked',
    },
  ];

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Executive Control Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Start with verified data. Workforce capacity, constraints, simulations, and recommendations stay gated until the tenant has enough clean operational evidence.
          </p>
        </div>
        <Button asChild>
          <Link href="/intelligence/readiness">
            Open Data Gate
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Data Readiness Index</CardTitle>
                <CardDescription>Hard gate for intelligence activation</CardDescription>
              </div>
              <Badge className={isReady ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-100'}>
                {isReady ? 'PASS' : 'BLOCKED'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-6xl font-bold tracking-tight text-slate-950">{score.toFixed(1)}%</div>
                <p className="mt-2 text-sm text-slate-500">Last audit: {formatDate(latest?.createdAt)}</p>
              </div>
              <div className="max-w-md rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  {isReady ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-rose-600" />}
                  <p className="font-medium text-slate-950">
                    {isReady ? 'Intelligence features can proceed.' : 'Run or complete the readiness gate first.'}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Every future score must expose confidence, freshness, and evidence before it reaches an executive dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Primary Operational Constraint</CardTitle>
            <CardDescription>Constraint detection begins after event capture and Workforce DNA snapshots.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-slate-500" />
                  <p className="font-medium text-slate-900">
                    {activeConstraints[0]?.name ?? 'Awaiting Phase 2 scanner'}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {activeConstraints[0]?.description ?? 'The system will identify the current constraint only after readiness, events, and capacity snapshots are in place.'}
                </p>
              </div>
            </CardContent>
          </Card>
      </div>

      {isReady && workforceSummary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Workforce stress</CardTitle>
              <CardDescription>Average stress load from latest Workforce DNA snapshots.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-950">{workforceSummary.averageStressLoad.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Critical risk profiles</CardTitle>
              <CardDescription>Employees currently in the highest risk band.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-950">{workforceSummary.criticalRiskCount}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Pressure zone</CardTitle>
              <CardDescription>Profiles under notable strain but not yet critical.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-950">{workforceSummary.pressureZoneCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.title} className="border-slate-200 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <tile.icon className="h-5 w-5" />
                </div>
                <Badge variant="outline">{tile.status}</Badge>
              </div>
              <CardTitle className="text-base">{tile.title}</CardTitle>
              <CardDescription>{tile.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href={tile.href}>
                  Open
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Advisory Rule
          </CardTitle>
          <CardDescription>AI is deliberately last in the chain.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {[
            'Readiness proves the data can be trusted.',
            'Deterministic engines create scores and constraints.',
            'AI explains evidence-backed findings for review.',
          ].map((item, index) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {index + 1}
              </div>
              <p className="text-sm font-medium text-slate-800">{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
