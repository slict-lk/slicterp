import { PrismaClient } from '@prisma/client';
import { AppError, ValidationError } from '@/lib/error-handler';
import { getActiveConstraints } from '../constraints/constraint-service';
import { getLatestDataReadinessAudit } from '../readiness/readiness-service';
import { getIntelligenceSettings } from '../settings/intelligence-settings-service';
import { getLatestWorkforceSnapshots, getWorkforceDashboardData } from '../workforce/capacity-service';

export type ScenarioType =
  | 'PROMOTE_EMPLOYEE'
  | 'REMOVE_EMPLOYEE'
  | 'DELEGATE_APPROVALS'
  | 'INCREASE_WORKLOAD'
  | 'OPEN_BRANCH'
  | 'ADD_ASSISTANT_MANAGER'
  | 'REDUCE_TEAM_CAPACITY';

export interface SimulationScenarioInput {
  scenarioType: ScenarioType;
  employeeId?: string | null;
  departmentName?: string | null;
  workloadChangePercent?: number | null;
  approvalDelegationThreshold?: number | null;
  branchCount?: number | null;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function summarizeWorkforce(snapshots: Awaited<ReturnType<typeof getLatestWorkforceSnapshots>>) {
  const count = Math.max(snapshots.length, 1);
  return {
    employeeCount: snapshots.length,
    averageStress: round(snapshots.reduce((sum, item) => sum + item.stressLoad, 0) / count),
    averageDependency: round(snapshots.reduce((sum, item) => sum + item.systemDependency, 0) / count),
    averageSuccession: round(snapshots.reduce((sum, item) => sum + item.successionReadiness, 0) / count),
    criticalRiskCount: snapshots.filter((item) => item.category === 'CRITICAL_RISK').length,
    pressureZoneCount: snapshots.filter((item) => item.category === 'PRESSURE_ZONE').length,
  };
}

export async function getSimulatorBaseline(prisma: PrismaClient, tenantId: string) {
  const [readiness, settings, workforce, snapshots, constraints] = await Promise.all([
    getLatestDataReadinessAudit(prisma, tenantId),
    getIntelligenceSettings(prisma, tenantId),
    getWorkforceDashboardData(prisma, tenantId),
    getLatestWorkforceSnapshots(prisma, tenantId),
    getActiveConstraints(prisma, tenantId),
  ]);

  return {
    readinessStatus: readiness?.status ?? 'BLOCKED',
    settings,
    workforceSummary: workforce.summary,
    departments: workforce.departments,
    employees: snapshots.map((snapshot) => ({
      employeeId: snapshot.employeeId,
      name: `${snapshot.firstName} ${snapshot.lastName}`,
      position: snapshot.position,
      departmentName: snapshot.departmentName,
      stressLoad: snapshot.stressLoad,
      systemDependency: snapshot.systemDependency,
      successionReadiness: snapshot.successionReadiness,
      confidence: snapshot.confidence,
    })),
    activeConstraintCount: constraints.length,
  };
}

export async function runSimulatorScenario(
  prisma: PrismaClient,
  tenantId: string,
  input: SimulationScenarioInput
) {
  const [readiness, settings, snapshots, constraints] = await Promise.all([
    getLatestDataReadinessAudit(prisma, tenantId),
    getIntelligenceSettings(prisma, tenantId),
    getLatestWorkforceSnapshots(prisma, tenantId),
    getActiveConstraints(prisma, tenantId),
  ]);

  if (!readiness || readiness.status !== 'PASS') {
    throw new AppError(
      'Data readiness gate is blocked. Pass readiness before running simulations.',
      409,
      'READINESS_BLOCKED',
      {
        readinessStatus: readiness?.status ?? 'BLOCKED',
        requiredStatus: 'PASS',
      }
    );
  }

  const before = summarizeWorkforce(snapshots);
  const selectedEmployee = input.employeeId
    ? snapshots.find((snapshot) => snapshot.employeeId === input.employeeId) ?? null
    : null;
  const departmentEmployees = input.departmentName
    ? snapshots.filter((snapshot) => snapshot.departmentName === input.departmentName)
    : [];
  const workloadChangePercent = input.workloadChangePercent ?? 10;
  const approvalThreshold = input.approvalDelegationThreshold ?? settings.approvalDelegationThresholdLkr;
  const branchCount = Math.max(1, Math.round(Number(input.branchCount ?? 1)));

  let stressDelta = 0;
  let dependencyDelta = 0;
  let successionDelta = 0;
  let criticalRiskDelta = 0;
  const warnings: string[] = [];
  const assumptions: string[] = [];

  switch (input.scenarioType) {
    case 'PROMOTE_EMPLOYEE':
      if (!selectedEmployee) {
        throw new ValidationError('Choose an employee before running a promotion scenario.');
      }
      stressDelta = round((selectedEmployee.systemDependency * 0.08) - (selectedEmployee.stressLoad * 0.03));
      dependencyDelta = round(selectedEmployee.systemDependency * 0.12);
      successionDelta = round(-Math.max(6, (100 - selectedEmployee.successionReadiness) * 0.12));
      if (selectedEmployee.successionReadiness < 50) {
        warnings.push(`${selectedEmployee.firstName} ${selectedEmployee.lastName} has weak backup coverage, so promotion creates a local succession gap.`);
        criticalRiskDelta += 1;
      }
      assumptions.push('Simulation treats promotion as removing part of the employee’s current operating load from the team.');
      break;

    case 'REMOVE_EMPLOYEE':
      if (!selectedEmployee) {
        throw new ValidationError('Choose an employee before running a removal scenario.');
      }
      stressDelta = round((selectedEmployee.stressLoad * 0.16) + 6);
      dependencyDelta = round((selectedEmployee.systemDependency * 0.22) + 4);
      successionDelta = round(-Math.max(10, (100 - selectedEmployee.successionReadiness) * 0.18));
      criticalRiskDelta = selectedEmployee.systemDependency >= 60 ? 2 : 1;
      warnings.push('This scenario assumes the workload is redistributed immediately without headcount replacement.');
      assumptions.push('Removal simulation is a stress test, not a recommendation.');
      break;

    case 'DELEGATE_APPROVALS': {
      const decisionConstraints = constraints.filter((constraint) => constraint.type === 'DECISION').length;
      stressDelta = round(-Math.max(4, Math.min(12, decisionConstraints * 3)));
      dependencyDelta = round(-Math.max(3, decisionConstraints * 2));
      successionDelta = round(4);
      criticalRiskDelta = decisionConstraints > 0 ? -1 : 0;
      assumptions.push(`Simulation uses a delegation threshold of LKR ${approvalThreshold.toLocaleString()}.`);
      if (approvalThreshold < 50000) {
        warnings.push('Very low delegation thresholds can increase management overhead instead of reducing it.');
      }
      break;
    }

    case 'INCREASE_WORKLOAD': {
      const affectedPeople = Math.max(departmentEmployees.length || snapshots.length, 1);
      stressDelta = round((workloadChangePercent * 0.42) / Math.max(affectedPeople / 3, 1));
      dependencyDelta = round(workloadChangePercent * 0.18);
      successionDelta = round(-(workloadChangePercent * 0.12));
      criticalRiskDelta = workloadChangePercent >= 20 ? 2 : 1;
      assumptions.push(`Simulation spreads a ${workloadChangePercent}% workload increase across ${affectedPeople} profile(s).`);
      if (input.departmentName) {
        warnings.push(`${input.departmentName} may become the next primary constraint if no offsetting capacity is added.`);
      }
      break;
    }

    case 'OPEN_BRANCH': {
      const affectedPeople = Math.max(departmentEmployees.length || snapshots.length, 1);
      const expansionLoad = workloadChangePercent * branchCount;
      stressDelta = round((expansionLoad * 0.34) / Math.max(affectedPeople / 4, 1) + 5);
      dependencyDelta = round(expansionLoad * 0.16 + Math.max(0, before.averageDependency - 45) * 0.08);
      successionDelta = round(-(8 + expansionLoad * 0.08));
      criticalRiskDelta = expansionLoad >= 25 || before.averageSuccession < 55 ? 2 : 1;
      assumptions.push(`Opening ${branchCount} branch(es) is modeled as a ${expansionLoad}% operating-load expansion before new local capacity is fully trained.`);
      if (input.departmentName) {
        warnings.push(`${input.departmentName} is treated as the launch support department for this branch expansion.`);
      }
      if (before.averageSuccession < 55) {
        warnings.push('Current succession readiness is weak for branch expansion without backup owners.');
      }
      break;
    }

    case 'ADD_ASSISTANT_MANAGER': {
      const affectedPeople = Math.max(departmentEmployees.length || snapshots.length, 1);
      stressDelta = round(-Math.max(5, Math.min(16, 18 / Math.max(affectedPeople / 4, 1))));
      dependencyDelta = round(-Math.max(4, before.averageDependency * 0.08));
      successionDelta = round(8);
      criticalRiskDelta = before.criticalRiskCount > 0 ? -1 : 0;
      assumptions.push('Assistant manager capacity is modeled as decision relief plus better backup coverage, not instant headcount replacement.');
      if (!input.departmentName) {
        warnings.push('No department was selected, so the assistant manager effect was applied across the whole workforce baseline.');
      }
      break;
    }

    case 'REDUCE_TEAM_CAPACITY': {
      const affectedPeople = Math.max(departmentEmployees.length || snapshots.length, 1);
      const reduction = Math.max(5, workloadChangePercent);
      stressDelta = round((reduction * 0.5) / Math.max(affectedPeople / 3, 1) + 4);
      dependencyDelta = round(reduction * 0.24);
      successionDelta = round(-(reduction * 0.22 + 5));
      criticalRiskDelta = reduction >= 20 ? 2 : 1;
      assumptions.push(`Team capacity reduction is modeled as ${reduction}% less available capacity across ${affectedPeople} profile(s).`);
      warnings.push('This is a resilience stress test, not a recommended action.');
      if (input.departmentName) {
        warnings.push(`${input.departmentName} becomes the immediate impact area for the capacity reduction.`);
      }
      break;
    }
  }

  const after = {
    averageStress: clamp(round(before.averageStress + stressDelta)),
    averageDependency: clamp(round(before.averageDependency + dependencyDelta)),
    averageSuccession: clamp(round(before.averageSuccession + successionDelta)),
    criticalRiskCount: Math.max(0, before.criticalRiskCount + criticalRiskDelta),
    pressureZoneCount: Math.max(0, before.pressureZoneCount + (stressDelta >= 6 ? 1 : stressDelta <= -4 ? -1 : 0)),
    employeeCount: before.employeeCount,
  };

  if (after.averageStress >= 75) {
    warnings.push('Simulated average stress crosses the high-risk threshold.');
  }
  if (after.averageSuccession <= 45) {
    warnings.push('Succession readiness falls into a fragile band under this scenario.');
  }
  if (after.averageDependency >= 65) {
    warnings.push('Dependency concentration remains too high for resilient scaling.');
  }

  return {
    readinessStatus: readiness.status,
    scenario: input,
    before,
    after,
    delta: {
      averageStress: round(after.averageStress - before.averageStress),
      averageDependency: round(after.averageDependency - before.averageDependency),
      averageSuccession: round(after.averageSuccession - before.averageSuccession),
      criticalRiskCount: after.criticalRiskCount - before.criticalRiskCount,
      pressureZoneCount: after.pressureZoneCount - before.pressureZoneCount,
    },
    warnings,
    assumptions,
    confidence: clamp(round((readiness.score * 0.45) + ((snapshots.reduce((sum, snapshot) => sum + snapshot.confidence, 0) / Math.max(snapshots.length, 1)) * 0.45) + 10)),
    affectedScope: {
      employeeId: selectedEmployee?.employeeId ?? null,
      employeeName: selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : null,
      departmentName: input.departmentName ?? null,
      affectedProfiles: departmentEmployees.length || snapshots.length,
      activeConstraints: constraints.length,
    },
  };
}
