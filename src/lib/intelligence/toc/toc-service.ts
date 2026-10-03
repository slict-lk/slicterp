import { PrismaClient } from '@prisma/client';
import { getActiveConstraints } from '../constraints/constraint-service';
import { listOperationalEvents } from '../events/operational-event-service';
import { getIntelligenceRecommendations } from '../recommendations/recommendation-service';
import { getLatestDataReadinessAudit } from '../readiness/readiness-service';
import { getWorkforceDashboardData } from '../workforce/capacity-service';

export interface TocNodeView {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    kind: 'goal' | 'condition' | 'effect' | 'constraint' | 'injection' | 'outcome';
    description: string;
    confidence?: number;
    severity?: number;
    evidence?: string[];
  };
}

export interface TocEdgeView {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface TocTreeView {
  key: 'goal' | 'crt' | 'frt';
  label: string;
  description: string;
  nodes: TocNodeView[];
  edges: TocEdgeView[];
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function effectChainForConstraint(constraint: Awaited<ReturnType<typeof getActiveConstraints>>[number]) {
  if (constraint.type === 'DECISION') {
    return {
      rootCause: 'Approvals remain too centralized for low-risk decisions.',
      effect: 'Pending approval queue grows faster than it clears.',
      undesirable: 'Operational decisions stall and team load concentrates.',
      outcome: 'Customer or delivery commitments absorb the delay.',
    };
  }
  if (constraint.type === 'HUMAN') {
    return {
      rootCause: 'One employee carries a disproportionate share of critical work.',
      effect: 'Backlog, overtime, and interruptions accumulate around one role.',
      undesirable: 'Throughput becomes fragile and quality risk rises.',
      outcome: 'A single absence or spike can disrupt service.',
    };
  }
  if (constraint.type === 'SKILL') {
    return {
      rootCause: 'Key process knowledge is concentrated in one person.',
      effect: 'Backup coverage cannot absorb normal demand variation.',
      undesirable: 'Dependency risk compounds operational stress.',
      outcome: 'Managers lose flexibility in staffing and scheduling.',
    };
  }
  if (constraint.type === 'PROCESS') {
    return {
      rootCause: 'Task flow and due-date discipline are slipping.',
      effect: 'A local queue grows and starts delaying dependent work.',
      undesirable: 'Operational load appears as chronic backlog.',
      outcome: 'Teams spend more time expediting than executing.',
    };
  }
  return {
    rootCause: 'Department-level pressure is outpacing current capacity.',
    effect: 'The bottleneck is spreading beyond one queue or one person.',
    undesirable: 'Managers are forced into reactive prioritization.',
    outcome: 'Execution quality and predictability decline together.',
  };
}

function evidenceStrings(constraint: Awaited<ReturnType<typeof getActiveConstraints>>[number]) {
  const evidence = constraint.evidence ?? {};
  return [
    `Constraint type: ${constraint.type}.`,
    `Severity: ${round(constraint.severity)}%. Confidence: ${round(constraint.confidence)}%.`,
    `Process key: ${constraint.linkedProcessKey ?? 'not mapped'}.`,
    ...Object.entries(evidence).slice(0, 4).map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value).slice(0, 180) : String(value)}.`),
  ];
}

function recommendedInjectionForConstraint(constraint: Awaited<ReturnType<typeof getActiveConstraints>>[number]) {
  if (constraint.type === 'DECISION') return 'Delegate low-risk decisions and reduce approval queue concentration';
  if (constraint.type === 'HUMAN') return 'Redistribute workload and add temporary backup coverage';
  if (constraint.type === 'SKILL') return 'Create cross-training and named backup ownership';
  if (constraint.type === 'PROCESS') return 'Triage backlog and define service-level rules';
  return 'Stabilize the constrained department before adding more demand';
}

export async function getTocWorkspaceData(prisma: PrismaClient, tenantId: string) {
  const [readiness, workforce, constraints, recommendations, events] = await Promise.all([
    getLatestDataReadinessAudit(prisma, tenantId),
    getWorkforceDashboardData(prisma, tenantId),
    getActiveConstraints(prisma, tenantId),
    getIntelligenceRecommendations(prisma, tenantId),
    listOperationalEvents(prisma, tenantId, { limit: 8 }),
  ]);

  const primaryConstraint = constraints[0] ?? null;
  const secondaryConstraints = constraints.slice(1, 4);
  const primaryRecommendation = recommendations.recommendations[0] ?? null;
  const chain = primaryConstraint ? effectChainForConstraint(primaryConstraint) : null;

  const goalTree: TocTreeView = {
    key: 'goal',
    label: 'Goal Tree',
    description: 'Strategic objective and the necessary operating conditions that support it.',
    nodes: [
      {
        id: 'goal',
        position: { x: 380, y: 20 },
        data: {
          label: 'Increase operational efficiency without overloading the workforce',
          kind: 'goal',
          description: 'Primary strategic goal for the intelligence layer.',
          confidence: readiness?.score ?? 0,
          evidence: [
            `Readiness score: ${readiness?.score ?? 0}%.`,
            `Average workforce stress: ${workforce.summary.averageStressLoad}%.`,
          ],
        },
      },
      {
        id: 'condition-workload',
        position: { x: 40, y: 180 },
        data: {
          label: 'Balanced workload',
          kind: 'condition',
          description: 'Keep average stress and queue depth within acceptable limits.',
          severity: round(workforce.summary.averageStressLoad),
          evidence: [`Average stress is ${workforce.summary.averageStressLoad}% across active profiles.`],
        },
      },
      {
        id: 'condition-dependency',
        position: { x: 300, y: 180 },
        data: {
          label: 'Reduced dependency risk',
          kind: 'condition',
          description: 'Avoid key-person concentration without backup coverage.',
          severity: primaryConstraint?.linkedProcessKey === 'DEPENDENCY_CONCENTRATION' ? primaryConstraint.severity : 45,
          evidence: [`${workforce.summary.criticalRiskCount} critical profiles currently need attention.`],
        },
      },
      {
        id: 'condition-decision',
        position: { x: 560, y: 180 },
        data: {
          label: 'Faster decision flow',
          kind: 'condition',
          description: 'Shorten approval queue build-up and remove avoidable waiting.',
          severity: primaryConstraint?.linkedProcessKey === 'APPROVAL_CHAIN' ? primaryConstraint.severity : 40,
          evidence: [`${constraints.filter((item) => item.type === 'DECISION').length} decision bottlenecks are active.`],
        },
      },
      {
        id: 'condition-succession',
        position: { x: 820, y: 180 },
        data: {
          label: 'Succession and coverage',
          kind: 'condition',
          description: 'Maintain backup capacity when critical roles shift or expand.',
          severity: round((workforce.summary.pressureZoneCount / Math.max(workforce.summary.employeeCount, 1)) * 100),
          evidence: [`${workforce.summary.pressureZoneCount} profiles are currently in the pressure zone.`],
        },
      },
    ],
    edges: [
      { id: 'e-goal-workload', source: 'goal', target: 'condition-workload', label: 'requires' },
      { id: 'e-goal-dependency', source: 'goal', target: 'condition-dependency', label: 'requires' },
      { id: 'e-goal-decision', source: 'goal', target: 'condition-decision', label: 'requires' },
      { id: 'e-goal-succession', source: 'goal', target: 'condition-succession', label: 'requires' },
    ],
  };

  const currentRealityTree: TocTreeView = {
    key: 'crt',
    label: 'Current Reality Tree',
    description: 'Primary undesirable effect traced back to the most likely root constraint.',
    nodes: primaryConstraint && chain ? [
      {
        id: 'crt-outcome',
        position: { x: 340, y: 20 },
        data: {
          label: chain.outcome,
          kind: 'outcome',
          description: 'Observed organizational risk if the current path continues.',
          confidence: primaryConstraint.confidence,
          evidence: [
            ...events.slice(0, 2).map((event) => `${event.action} in ${event.moduleKey} at ${event.occurredAt.toISOString()}`),
            ...evidenceStrings(primaryConstraint).slice(0, 2),
          ],
        },
      },
      {
        id: 'crt-undesirable',
        position: { x: 340, y: 180 },
        data: {
          label: chain.undesirable,
          kind: 'effect',
          description: 'Undesirable effect created by the active bottleneck.',
          severity: primaryConstraint.severity,
          confidence: primaryConstraint.confidence,
          evidence: [`Active constraint: ${primaryConstraint.name}`],
        },
      },
      {
        id: 'crt-effect',
        position: { x: 340, y: 340 },
        data: {
          label: chain.effect,
          kind: 'effect',
          description: 'Operational effect seen before the business-level consequence.',
          severity: primaryConstraint.severity,
          evidence: [primaryConstraint.description ?? 'Constraint description unavailable.'],
        },
      },
      {
        id: 'crt-root',
        position: { x: 340, y: 500 },
        data: {
          label: chain.rootCause,
          kind: 'constraint',
          description: 'Most likely root cause inferred from the current constraint pattern.',
          severity: primaryConstraint.severity,
          confidence: primaryConstraint.confidence,
          evidence: evidenceStrings(primaryConstraint),
        },
      },
      ...secondaryConstraints.map<TocNodeView>((constraint, index) => ({
        id: `crt-secondary-${index}`,
        position: { x: 40 + (index * 300), y: 660 },
        data: {
          label: constraint.name,
          kind: 'constraint',
          description: constraint.description ?? 'Secondary constraint detected by the scanner.',
          severity: constraint.severity,
          confidence: constraint.confidence,
          evidence: evidenceStrings(constraint),
        },
      })),
    ] : [
      {
        id: 'crt-empty',
        position: { x: 280, y: 120 },
        data: {
          label: 'No active constraints to trace yet',
          kind: 'effect',
          description: 'Run workforce snapshots and constraint scanning to populate the CRT.',
        },
      },
    ],
    edges: primaryConstraint && chain ? [
      { id: 'crt-1', source: 'crt-root', target: 'crt-effect', label: 'causes' },
      { id: 'crt-2', source: 'crt-effect', target: 'crt-undesirable', label: 'drives' },
      { id: 'crt-3', source: 'crt-undesirable', target: 'crt-outcome', label: 'becomes' },
      ...secondaryConstraints.map<TocEdgeView>((_, index) => ({
        id: `crt-secondary-edge-${index}`,
        source: `crt-secondary-${index}`,
        target: 'crt-undesirable',
        label: 'contributes',
      })),
    ] : [],
  };

  const fallbackInjection = primaryConstraint ? recommendedInjectionForConstraint(primaryConstraint) : null;
  const frtInjectionLabel = primaryRecommendation?.title ?? fallbackInjection;
  const frtConfidence = primaryRecommendation?.confidence ?? primaryConstraint?.confidence ?? 0;

  const futureRealityTree: TocTreeView = {
    key: 'frt',
    label: 'Future Reality Tree',
    description: 'A likely future path if the leading recommendation is applied.',
    nodes: primaryConstraint && frtInjectionLabel ? [
      {
        id: 'frt-injection',
        position: { x: 340, y: 20 },
        data: {
          label: frtInjectionLabel,
          kind: 'injection',
          description: primaryRecommendation
            ? 'Primary intervention suggested by the recommendation engine.'
            : 'Generated intervention from the current primary constraint pattern.',
          confidence: frtConfidence,
          evidence: primaryRecommendation?.actions ?? evidenceStrings(primaryConstraint),
        },
      },
      {
        id: 'frt-relief',
        position: { x: 340, y: 190 },
        data: {
          label: 'Constraint pressure eases on the affected process',
          kind: 'effect',
          description: 'The immediate queue or overload should reduce if the change is executed well.',
          confidence: frtConfidence,
          evidence: primaryRecommendation?.evidence ?? [`Constraint evidence: ${primaryConstraint.name}`],
        },
      },
      {
        id: 'frt-capacity',
        position: { x: 340, y: 360 },
        data: {
          label: 'Workforce capacity becomes more distributable',
          kind: 'condition',
          description: 'The team gains more room to absorb demand without local collapse.',
          severity: round(Math.max(0, workforce.summary.averageStressLoad - 8)),
          evidence: ['Simulated benefit assumes disciplined delegation and manager follow-through.'],
        },
      },
      {
        id: 'frt-outcome',
        position: { x: 340, y: 530 },
        data: {
          label: 'Higher throughput with lower overload risk',
          kind: 'outcome',
          description: 'The desired future state that TOC aims to produce.',
          confidence: frtConfidence,
          evidence: [primaryRecommendation ? `Recommendation status currently: ${primaryRecommendation.status}.` : 'Generated before formal recommendation review.'],
        },
      },
      ...secondaryConstraints.map<TocNodeView>((constraint, index) => ({
        id: `frt-guardrail-${index}`,
        position: { x: 40 + index * 300, y: 700 },
        data: {
          label: `Guardrail: ${constraint.name}`,
          kind: 'condition',
          description: 'Secondary constraint that should be monitored while applying the main intervention.',
          severity: constraint.severity,
          confidence: constraint.confidence,
          evidence: evidenceStrings(constraint).slice(0, 3),
        },
      })),
    ] : [
      {
        id: 'frt-empty',
        position: { x: 260, y: 120 },
        data: {
          label: 'No recommendation available for simulation pathing yet',
          kind: 'effect',
          description: 'The FRT will populate once constraints and recommendations are available.',
        },
      },
    ],
    edges: primaryConstraint && frtInjectionLabel ? [
      { id: 'frt-1', source: 'frt-injection', target: 'frt-relief', label: 'creates' },
      { id: 'frt-2', source: 'frt-relief', target: 'frt-capacity', label: 'supports' },
      { id: 'frt-3', source: 'frt-capacity', target: 'frt-outcome', label: 'improves' },
      ...secondaryConstraints.map<TocEdgeView>((_, index) => ({
        id: `frt-guardrail-edge-${index}`,
        source: `frt-guardrail-${index}`,
        target: 'frt-capacity',
        label: 'must monitor',
      })),
    ] : [],
  };

  return {
    readinessStatus: readiness?.status ?? 'BLOCKED',
    primaryConstraint,
    trees: [goalTree, currentRealityTree, futureRealityTree],
  };
}
