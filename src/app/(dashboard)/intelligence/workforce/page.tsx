'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  RefreshCw,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfidenceBadge } from '@/components/intelligence/confidence-badge';
import { DataFreshnessStamp } from '@/components/intelligence/data-freshness-stamp';

type WorkforceSnapshot = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  position: string;
  departmentName: string | null;
  category: string;
  confidence: number;
  stressLoad: number;
  systemDependency: number;
  productivity: number;
  successionReadiness: number;
  functionalCapacity: number;
  leadershipCapacity: number;
  cognitiveComplexity: number;
  growthPotential: number;
  adaptability: number;
  inputSummary: Record<string, number>;
  warnings: string[] | null;
};

type WorkforceResponse = {
  success: boolean;
  data: {
    summary: {
      employeeCount: number;
      averageStressLoad: number;
      averageConfidence: number;
      criticalRiskCount: number;
      pressureZoneCount: number;
      latestGeneratedAt: string | null;
    };
    departments: Array<{
      departmentName: string;
      employees: number;
      averageStress: number;
      averageDependency: number;
      highRiskCount: number;
    }>;
    snapshots: WorkforceSnapshot[];
    history: Record<string, Array<{
      createdAt: string;
      stressLoad: number;
      productivity: number;
      systemDependency: number;
      confidence: number;
    }>>;
  };
};

function categoryTone(category: string) {
  if (category === 'CRITICAL_RISK') return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
  if (category === 'PRESSURE_ZONE') return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
  if (category === 'STRATEGIC_TALENT') return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
  if (category === 'HIGH_CAPACITY') return 'bg-sky-100 text-sky-700 hover:bg-sky-100';
  return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
}

function formatPointLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export default function WorkforceIntelligencePage() {
  const [data, setData] = useState<WorkforceResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  async function loadWorkforce() {
    const response = await fetch('/api/intelligence/workforce');
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload?.error?.message || 'Failed to load workforce intelligence.');
    }
    setData(payload.data);
  }

  useEffect(() => {
    loadWorkforce()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function runSnapshots() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/intelligence/workforce/run', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Failed to generate workforce snapshots.');
      }
      await loadWorkforce();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate workforce snapshots.');
    } finally {
      setRunning(false);
    }
  }

  const selectedEmployee = data?.snapshots.find((snapshot) => snapshot.employeeId === selectedEmployeeId) ?? null;
  const selectedHistory = selectedEmployee ? data?.history[selectedEmployee.employeeId] ?? [] : [];
  const employeeCount = data?.summary.employeeCount ?? 0;
  const averageStressLoad = data?.summary.averageStressLoad ?? 0;
  const criticalRiskCount = data?.summary.criticalRiskCount ?? 0;
  const averageConfidence = data?.summary.averageConfidence ?? 0;

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">Loading Workforce DNA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Workforce DNA Analytics</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Workforce capacity snapshots turn attendance, tasks, approvals, and reporting lines into confidence-scored employee profiles.
          </p>
        </div>
        <Button onClick={runSnapshots} disabled={running}>
          {running ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {running ? 'Generating Snapshots' : 'Run Workforce Snapshot'}
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
            <p className="text-sm font-medium text-slate-500">Active profiles</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{employeeCount}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Average stress</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{averageStressLoad.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Critical risk</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{criticalRiskCount}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Average confidence</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{averageConfidence.toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-slate-500" />
          <p className="text-sm text-slate-700">
            Every profile exposes its own confidence score and limitations.
          </p>
        </div>
        <DataFreshnessStamp value={data?.summary.latestGeneratedAt ?? null} />
      </div>

      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roster">Roster Table</TabsTrigger>
          <TabsTrigger value="heatmap">Department Heatmap</TabsTrigger>
          <TabsTrigger value="org">Organization Map</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Workforce roster</CardTitle>
              <CardDescription>Open an employee to inspect Capacity DNA, workload trend, and confidence notes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stress</TableHead>
                    <TableHead>Dependency</TableHead>
                    <TableHead>Productivity</TableHead>
                    <TableHead>Succession</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.snapshots.map((snapshot) => (
                    <TableRow
                      key={snapshot.employeeId}
                      className="cursor-pointer"
                      onClick={() => setSelectedEmployeeId(snapshot.employeeId)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-950">{snapshot.firstName} {snapshot.lastName}</p>
                          <p className="text-xs text-slate-500">{snapshot.position}</p>
                        </div>
                      </TableCell>
                      <TableCell>{snapshot.departmentName ?? 'Unassigned'}</TableCell>
                      <TableCell>
                        <Badge className={categoryTone(snapshot.category)}>{snapshot.category.replaceAll('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>{snapshot.stressLoad}%</TableCell>
                      <TableCell>{snapshot.systemDependency}%</TableCell>
                      <TableCell>{snapshot.productivity}%</TableCell>
                      <TableCell>{snapshot.successionReadiness}%</TableCell>
                      <TableCell><ConfidenceBadge value={snapshot.confidence} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data?.departments.map((department) => (
              <Card key={department.departmentName} className="border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <Badge variant="outline">{department.employees} people</Badge>
                  </div>
                  <CardTitle className="text-base">{department.departmentName}</CardTitle>
                  <CardDescription>{department.highRiskCount} employee(s) in elevated risk bands</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600">Average stress</span>
                      <span className="font-medium text-slate-950">{department.averageStress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-rose-500" style={{ width: `${department.averageStress}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600">Average dependency</span>
                      <span className="font-medium text-slate-950">{department.averageDependency}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${department.averageDependency}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="org" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data?.snapshots.map((snapshot) => (
              <Card key={snapshot.employeeId} className="border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{snapshot.firstName} {snapshot.lastName}</CardTitle>
                      <CardDescription>{snapshot.position}</CardDescription>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Department</span>
                    <span className="font-medium text-slate-900">{snapshot.departmentName ?? 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Stress load</span>
                    <span className="font-medium text-slate-900">{snapshot.stressLoad}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Dependency</span>
                    <span className="font-medium text-slate-900">{snapshot.systemDependency}%</span>
                  </div>
                  <ConfidenceBadge value={snapshot.confidence} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={Boolean(selectedEmployee)} onOpenChange={(open) => !open && setSelectedEmployeeId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedEmployee && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedEmployee.firstName} {selectedEmployee.lastName}</SheetTitle>
                <SheetDescription>{selectedEmployee.position} · {selectedEmployee.departmentName ?? 'Unassigned department'}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={categoryTone(selectedEmployee.category)}>{selectedEmployee.category.replaceAll('_', ' ')}</Badge>
                  <ConfidenceBadge value={selectedEmployee.confidence} />
                </div>

                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle>Capacity DNA</CardTitle>
                    <CardDescription>Nine-dimension radar chart for the latest snapshot.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        data={[
                          { metric: 'Functional', value: selectedEmployee.functionalCapacity },
                          { metric: 'Leadership', value: selectedEmployee.leadershipCapacity },
                          { metric: 'Cognitive', value: selectedEmployee.cognitiveComplexity },
                          { metric: 'Dependency', value: selectedEmployee.systemDependency },
                          { metric: 'Productivity', value: selectedEmployee.productivity },
                          { metric: 'Stress', value: selectedEmployee.stressLoad },
                          { metric: 'Growth', value: selectedEmployee.growthPotential },
                          { metric: 'Succession', value: selectedEmployee.successionReadiness },
                          { metric: 'Adaptability', value: selectedEmployee.adaptability },
                        ]}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                        <Radar dataKey="value" stroke="#0f766e" fill="#14b8a6" fillOpacity={0.25} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle>Rolling snapshot trend</CardTitle>
                    <CardDescription>Recent generated values for stress, productivity, and dependency.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="createdAt" tickFormatter={formatPointLabel} />
                        <YAxis />
                        <Tooltip labelFormatter={formatPointLabel} />
                        <Line type="monotone" dataKey="stressLoad" stroke="#dc2626" strokeWidth={2} />
                        <Line type="monotone" dataKey="productivity" stroke="#0284c7" strokeWidth={2} />
                        <Line type="monotone" dataKey="systemDependency" stroke="#0f766e" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle>Input signals</CardTitle>
                    <CardDescription>Evidence that fed the current profile.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    {Object.entries(selectedEmployee.inputSummary ?? {}).map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">{key}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{String(value)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      Profile limitations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedEmployee.warnings?.length ? (
                      <div className="space-y-3">
                        {selectedEmployee.warnings.map((warning) => (
                          <div key={warning} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            {warning}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">No limitations flagged for the latest snapshot.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
