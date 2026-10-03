'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Play, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ConfidenceBadge } from '@/components/intelligence/confidence-badge';
import { IntelligenceAIOutputCard } from '@/components/intelligence/intelligence-ai-output-card';

type SimulatorBaseline = {
  success: boolean;
  data: {
    readinessStatus: string;
    settings: {
      approvalDelegationThresholdLkr: number;
    };
    workforceSummary: {
      employeeCount: number;
      averageStressLoad: number;
      averageConfidence: number;
      criticalRiskCount: number;
      pressureZoneCount: number;
    };
    departments: Array<{
      departmentName: string;
      employees: number;
      averageStress: number;
      averageDependency: number;
      highRiskCount: number;
    }>;
    employees: Array<{
      employeeId: string;
      name: string;
      position: string;
      departmentName: string | null;
      stressLoad: number;
      systemDependency: number;
      successionReadiness: number;
      confidence: number;
    }>;
    activeConstraintCount: number;
  };
};

type SimulationResult = {
  success: boolean;
  data: {
    scenario: {
      scenarioType: string;
      employeeId?: string | null;
      departmentName?: string | null;
      workloadChangePercent?: number | null;
      approvalDelegationThreshold?: number | null;
    };
    before: {
      averageStress: number;
      averageDependency: number;
      averageSuccession: number;
      criticalRiskCount: number;
      pressureZoneCount: number;
      employeeCount: number;
    };
    after: {
      averageStress: number;
      averageDependency: number;
      averageSuccession: number;
      criticalRiskCount: number;
      pressureZoneCount: number;
      employeeCount: number;
    };
    delta: {
      averageStress: number;
      averageDependency: number;
      averageSuccession: number;
      criticalRiskCount: number;
      pressureZoneCount: number;
    };
    warnings: string[];
    assumptions: string[];
  };
};

const scenarioLabels: Record<string, string> = {
  PROMOTE_EMPLOYEE: 'Promote Employee',
  REMOVE_EMPLOYEE: 'Remove Employee',
  DELEGATE_APPROVALS: 'Delegate Approvals',
  INCREASE_WORKLOAD: 'Increase Workload',
  OPEN_BRANCH: 'Open Branch',
  ADD_ASSISTANT_MANAGER: 'Add Assistant Manager',
  REDUCE_TEAM_CAPACITY: 'Reduce Team Capacity',
};

const employeeScenarios = ['PROMOTE_EMPLOYEE', 'REMOVE_EMPLOYEE'];
const departmentScenarios = ['INCREASE_WORKLOAD', 'OPEN_BRANCH', 'ADD_ASSISTANT_MANAGER', 'REDUCE_TEAM_CAPACITY'];
const workloadScenarios = ['INCREASE_WORKLOAD', 'OPEN_BRANCH', 'REDUCE_TEAM_CAPACITY'];

function deltaTone(value: number, reverse = false) {
  const effective = reverse ? value * -1 : value;
  if (effective > 0) return 'text-rose-700';
  if (effective < 0) return 'text-emerald-700';
  return 'text-slate-600';
}

export default function IntelligenceSimulatorPage() {
  const [baseline, setBaseline] = useState<SimulatorBaseline['data'] | null>(null);
  const [result, setResult] = useState<SimulationResult['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarioType, setScenarioType] = useState('PROMOTE_EMPLOYEE');
  const [employeeId, setEmployeeId] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [workloadChangePercent, setWorkloadChangePercent] = useState([15]);
  const [approvalDelegationThreshold, setApprovalDelegationThreshold] = useState([250000]);
  const [interpretation, setInterpretation] = useState<{
    content: string;
    confidence: number;
    freshness: { workforce: string | null };
    sourceSections: string[];
    warnings: string[];
  } | null>(null);

  async function loadBaseline() {
    const response = await fetch('/api/intelligence/simulator');
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload?.error?.message || 'Failed to load simulator baseline.');
    }
    setBaseline(payload.data);
    setApprovalDelegationThreshold([payload.data.settings.approvalDelegationThresholdLkr]);
    if (payload.data.employees[0] && !employeeId) {
      setEmployeeId(payload.data.employees[0].employeeId);
    }
    if (payload.data.departments[0] && !departmentName) {
      setDepartmentName(payload.data.departments[0].departmentName);
    }
  }

  useEffect(() => {
    loadBaseline()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedEmployee = useMemo(
    () => baseline?.employees.find((employee) => employee.employeeId === employeeId) ?? null,
    [baseline, employeeId]
  );
  const isReadinessBlocked = baseline?.readinessStatus !== 'PASS';

  async function runSimulation() {
    if (isReadinessBlocked) {
      setError('Data readiness gate is blocked. Run and pass the readiness audit before using the simulator.');
      return;
    }
    setRunning(true);
    setError(null);
    try {
      setInterpretation(null);
      const simulationPayload = {
        scenarioType,
        employeeId: employeeScenarios.includes(scenarioType) ? employeeId : null,
        departmentName: departmentScenarios.includes(scenarioType) ? departmentName : null,
        workloadChangePercent: workloadScenarios.includes(scenarioType) ? workloadChangePercent[0] : null,
        approvalDelegationThreshold: scenarioType === 'DELEGATE_APPROVALS' ? approvalDelegationThreshold[0] : null,
        branchCount: scenarioType === 'OPEN_BRANCH' ? 1 : null,
      };
      const response = await fetch('/api/intelligence/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulationPayload),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Simulation failed.');
      }
      setResult(payload.data);

      const aiResponse = await fetch('/api/intelligence/ai/simulator/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulationPayload),
      });
      const aiPayload = await aiResponse.json();
      if (aiResponse.ok && aiPayload.success) {
        setInterpretation(aiPayload.data.interpretation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed.');
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">Loading simulator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Organizational Intelligence</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Decision Sandbox</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Run deterministic before-and-after scenarios without changing live operations. The simulator stays advisory until a human accepts the operational change.
          </p>
        </div>
        <Button variant="outline" onClick={() => loadBaseline().catch((err) => setError(err.message))}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Baseline
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      {isReadinessBlocked ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-medium">Simulator is gated by data readiness.</p>
              <p className="mt-1 text-amber-800">
                This tenant must pass the readiness audit first, otherwise the simulator would produce weak or misleading projections.
              </p>
            </div>
            <Button asChild variant="outline" className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100">
              <Link href="/intelligence/readiness">Open Readiness</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="grid gap-4 p-6 md:grid-cols-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Readiness gate</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{baseline?.readinessStatus ?? 'BLOCKED'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active workforce profiles</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{baseline?.workforceSummary.employeeCount ?? 0}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active constraints</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{baseline?.activeConstraintCount ?? 0}</p>
          </div>
          <div className="flex items-end justify-start md:justify-end">
            <ConfidenceBadge value={baseline?.workforceSummary.averageConfidence ?? 0} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-blue-600" />
              Scenario Builder
            </CardTitle>
            <CardDescription>Choose a structural change, then compare its projected organizational effect.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Scenario type</Label>
              <Select value={scenarioType} onValueChange={setScenarioType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(scenarioLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {employeeScenarios.includes(scenarioType) && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {(baseline?.employees ?? []).map((employee) => (
                      <SelectItem key={employee.employeeId} value={employee.employeeId}>
                        {employee.name} · {employee.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEmployee ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-950">{selectedEmployee.name}</p>
                    <p className="mt-1">{selectedEmployee.departmentName ?? 'Unassigned'} · Stress {selectedEmployee.stressLoad}% · Dependency {selectedEmployee.systemDependency}%</p>
                  </div>
                ) : null}
              </div>
            )}

            {scenarioType === 'DELEGATE_APPROVALS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <Label>Delegation threshold</Label>
                  <Badge variant="outline">LKR {approvalDelegationThreshold[0].toLocaleString()}</Badge>
                </div>
                <Slider
                  min={25000}
                  max={1000000}
                  step={25000}
                  value={approvalDelegationThreshold}
                  onValueChange={setApprovalDelegationThreshold}
                />
              </div>
            )}

            {departmentScenarios.includes(scenarioType) && (
              <>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={departmentName} onValueChange={setDepartmentName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose department" />
                    </SelectTrigger>
                    <SelectContent>
                      {(baseline?.departments ?? []).map((department) => (
                        <SelectItem key={department.departmentName} value={department.departmentName}>
                          {department.departmentName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {workloadScenarios.includes(scenarioType) && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <Label>{scenarioType === 'REDUCE_TEAM_CAPACITY' ? 'Capacity reduction' : 'Workload change'}</Label>
                    <Badge variant="outline">
                      {scenarioType === 'REDUCE_TEAM_CAPACITY' ? '-' : '+'}{workloadChangePercent[0]}%
                    </Badge>
                  </div>
                  <Slider
                    min={5}
                    max={40}
                    step={5}
                    value={workloadChangePercent}
                    onValueChange={setWorkloadChangePercent}
                  />
                </div>
              </>
            )}

            <Button onClick={runSimulation} disabled={running || isReadinessBlocked} className="w-full">
              {running ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {running ? 'Running Simulation' : isReadinessBlocked ? 'Readiness Required' : 'Run Simulation'}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Before</CardTitle>
                <CardDescription>Current workforce baseline.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between"><span>Average stress</span><span className="font-semibold text-slate-950">{result?.before.averageStress ?? baseline?.workforceSummary.averageStressLoad ?? 0}%</span></div>
                <div className="flex items-center justify-between"><span>Critical risk</span><span className="font-semibold text-slate-950">{result?.before.criticalRiskCount ?? baseline?.workforceSummary.criticalRiskCount ?? 0}</span></div>
                <div className="flex items-center justify-between"><span>Pressure zone</span><span className="font-semibold text-slate-950">{result?.before.pressureZoneCount ?? baseline?.workforceSummary.pressureZoneCount ?? 0}</span></div>
                <div className="flex items-center justify-between"><span>Profiles</span><span className="font-semibold text-slate-950">{result?.before.employeeCount ?? baseline?.workforceSummary.employeeCount ?? 0}</span></div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>After</CardTitle>
                <CardDescription>Projected state if the scenario is executed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between"><span>Average stress</span><span className="font-semibold text-slate-950">{result?.after.averageStress ?? baseline?.workforceSummary.averageStressLoad ?? 0}%</span></div>
                <div className="flex items-center justify-between"><span>Critical risk</span><span className="font-semibold text-slate-950">{result?.after.criticalRiskCount ?? baseline?.workforceSummary.criticalRiskCount ?? 0}</span></div>
                <div className="flex items-center justify-between"><span>Pressure zone</span><span className="font-semibold text-slate-950">{result?.after.pressureZoneCount ?? baseline?.workforceSummary.pressureZoneCount ?? 0}</span></div>
                <div className="flex items-center justify-between"><span>Profiles</span><span className="font-semibold text-slate-950">{result?.after.employeeCount ?? baseline?.workforceSummary.employeeCount ?? 0}</span></div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Delta Split</CardTitle>
              <CardDescription>The direction matters more than the raw number: rising stress and rising dependency are warnings.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Stress delta</p>
                <p className={`mt-2 text-2xl font-bold ${deltaTone(result?.delta.averageStress ?? 0)}`}>
                  {result?.delta.averageStress ? `${result.delta.averageStress > 0 ? '+' : ''}${result.delta.averageStress}%` : '0%'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Dependency delta</p>
                <p className={`mt-2 text-2xl font-bold ${deltaTone(result?.delta.averageDependency ?? 0)}`}>
                  {result?.delta.averageDependency ? `${result.delta.averageDependency > 0 ? '+' : ''}${result.delta.averageDependency}%` : '0%'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Succession delta</p>
                <p className={`mt-2 text-2xl font-bold ${deltaTone(result?.delta.averageSuccession ?? 0, true)}`}>
                  {result?.delta.averageSuccession ? `${result.delta.averageSuccession > 0 ? '+' : ''}${result.delta.averageSuccession}%` : '0%'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Critical risk delta</p>
                <p className={`mt-2 text-2xl font-bold ${deltaTone(result?.delta.criticalRiskCount ?? 0)}`}>
                  {result?.delta.criticalRiskCount ? `${result.delta.criticalRiskCount > 0 ? '+' : ''}${result.delta.criticalRiskCount}` : '0'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Warnings and Assumptions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {(result?.warnings ?? []).length ? (
                  result?.warnings.map((warning) => (
                    <div key={warning} className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      {warning}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Run a simulation to see scenario-specific warnings.
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {(result?.assumptions ?? []).map((assumption) => (
                  <div key={assumption} className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    {assumption}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {interpretation ? (
            <IntelligenceAIOutputCard
              title="AI Scenario Interpretation"
              description="Generated from the same AI backend family over the current simulation result and intelligence context."
              content={interpretation.content}
              confidence={interpretation.confidence}
              freshness={interpretation.freshness.workforce}
              sourceSections={interpretation.sourceSections}
              warnings={interpretation.warnings}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
