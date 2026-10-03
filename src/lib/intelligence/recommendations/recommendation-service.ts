import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { getActiveConstraints } from '../constraints/constraint-service';
import { listOperationalEvents } from '../events/operational-event-service';
import { getLatestDataReadinessAudit } from '../readiness/readiness-service';
import {
  RecommendationStatus,
  RecommendationGovernanceEntry,
  getIntelligenceSettings,
  updateIntelligenceSettings,
} from '../settings/intelligence-settings-service';
import { getWorkforceDashboardData } from '../workforce/capacity-service';

export interface IntelligenceRecommendation {
  id: string;
  constraintId: string;
  title: string;
  summary: string;
  rationale: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: RecommendationStatus;
  confidence: number;
  ownerSuggestion: string;
  evidence: string[];
  actions: string[];
  linkedProcessKey: string | null;
  type: string;
  governance: RecommendationGovernanceEntry | null;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function buildStableId(parts: Array<string | null | undefined>) {
  const hash = createHash('sha1');
  hash.update(parts.filter(Boolean).join('|'));
  return hash.digest('hex').slice(0, 16);
}

export async function getIntelligenceRecommendations(prisma: PrismaClient, tenantId: string) {
  const [settings, readiness, workforce, constraints, recentEvents] = await Promise.all([
    getIntelligenceSettings(prisma, tenantId),
    getLatestDataReadinessAudit(prisma, tenantId),
    getWorkforceDashboardData(prisma, tenantId),
    getActiveConstraints(prisma, tenantId),
    listOperationalEvents(prisma, tenantId, { limit: 10 }),
  ]);

  if (!readiness || readiness.status !== 'PASS') {
    return {
      readinessStatus: readiness?.status ?? 'BLOCKED',
      recommendations: [] as IntelligenceRecommendation[],
      recentEvents,
    };
  }

  const recommendations = constraints
    .map<IntelligenceRecommendation | null>((constraint) => {
      const recommendationId = buildStableId([
        tenantId,
        constraint.type,
        constraint.linkedEmployeeId,
        constraint.linkedDepartmentId,
        constraint.linkedProcessKey,
        constraint.name,
      ]);
      const governance = settings.recommendationGovernanceById[recommendationId] ?? null;
      const persistedStatus = governance?.status ?? settings.recommendationStatusById[recommendationId];
      const baseStatus: RecommendationStatus =
        constraint.confidence >= settings.minimumRecommendationConfidence
          ? settings.requireHumanReview
            ? 'NEEDS_REVIEW'
            : 'DRAFT'
          : 'DRAFT';

      if (constraint.type === 'DECISION') {
        return {
          id: recommendationId,
          constraintId: constraint.id,
          title: 'Delegate low-risk approvals closer to the work',
          summary: constraint.name,
          rationale:
            'Approval concentration is slowing throughput. Delegating smaller decisions reduces queue build-up without changing control for higher-risk orders.',
          urgency: constraint.severity >= 80 ? 'CRITICAL' : 'HIGH',
          status: persistedStatus ?? baseStatus,
          confidence: round(constraint.confidence),
          ownerSuggestion: 'Operations lead and finance controller',
          evidence: [
            `${constraint.severity}% severity on the approval chain.`,
            `Average workforce stress is ${workforce.summary.averageStressLoad}% across ${workforce.summary.employeeCount} profiles.`,
            `Current delegation threshold baseline: LKR ${settings.approvalDelegationThresholdLkr.toLocaleString()}.`,
          ],
          actions: [
            `Delegate approvals below LKR ${settings.approvalDelegationThresholdLkr.toLocaleString()} to assistant managers.`,
            'Review pending approval queue daily until backlog returns to target.',
            'Monitor approval latency after policy change for two weeks.',
          ],
          linkedProcessKey: constraint.linkedProcessKey,
          type: constraint.type,
          governance,
        };
      }

      if (constraint.type === 'HUMAN') {
        return {
          id: recommendationId,
          constraintId: constraint.id,
          title: 'Relieve a key-person overload before service quality slips',
          summary: constraint.name,
          rationale:
            'One person is carrying enough load to become a short-term delivery risk. Redistribution and backup coverage should happen before the queue deepens.',
          urgency: constraint.severity >= 80 ? 'CRITICAL' : 'HIGH',
          status: persistedStatus ?? baseStatus,
          confidence: round(constraint.confidence),
          ownerSuggestion: 'Department manager and HR business partner',
          evidence: [
            `${constraint.severity}% stress severity was detected.`,
            `${workforce.summary.criticalRiskCount} workforce profiles are already in the critical band.`,
            'Recent workload evidence shows backlog and/or overtime concentration around one role.',
          ],
          actions: [
            'Reassign non-critical tasks to adjacent team members this week.',
            'Add temporary backup approval or fulfillment coverage.',
            'Track stress trend after redistribution before approving new workload.',
          ],
          linkedProcessKey: constraint.linkedProcessKey,
          type: constraint.type,
          governance,
        };
      }

      if (constraint.type === 'SKILL') {
        return {
          id: recommendationId,
          constraintId: constraint.id,
          title: 'Cross-train a backup for the current dependency hotspot',
          summary: constraint.name,
          rationale:
            'The organization is leaning too heavily on one person without enough succession coverage. Cross-training lowers operational fragility.',
          urgency: constraint.severity >= 75 ? 'HIGH' : 'MEDIUM',
          status: persistedStatus ?? baseStatus,
          confidence: round(constraint.confidence),
          ownerSuggestion: 'HR lead and functional manager',
          evidence: [
            `${constraint.severity}% combined dependency risk detected.`,
            `${workforce.summary.pressureZoneCount} profiles are already in the pressure zone.`,
            'Succession readiness is materially lower than dependency concentration.',
          ],
          actions: [
            'Nominate at least one backup owner for the process.',
            'Create a short operating checklist and knowledge transfer plan.',
            'Run a controlled handoff exercise before making structural changes.',
          ],
          linkedProcessKey: constraint.linkedProcessKey,
          type: constraint.type,
          governance,
        };
      }

      if (constraint.type === 'PROCESS') {
        return {
          id: recommendationId,
          constraintId: constraint.id,
          title: 'Trim the backlog before it becomes a department-wide bottleneck',
          summary: constraint.name,
          rationale:
            'A local process queue is slowing enough to create avoidable delivery pressure. Priority triage and service-level clarity can reduce noise quickly.',
          urgency: constraint.severity >= 75 ? 'HIGH' : 'MEDIUM',
          status: persistedStatus ?? baseStatus,
          confidence: round(constraint.confidence),
          ownerSuggestion: 'Operations manager',
          evidence: [
            `${constraint.severity}% severity on active backlog signals.`,
            `${recentEvents.length} recent operational events are available as supporting telemetry.`,
            'Constraint evidence includes overdue work concentration.',
          ],
          actions: [
            'Split overdue work into must-do, defer, and delegate lanes.',
            'Review due-date hygiene and assignee load balance.',
            'Escalate only the tasks that affect current customer commitments.',
          ],
          linkedProcessKey: constraint.linkedProcessKey,
          type: constraint.type,
          governance,
        };
      }

      if (constraint.type === 'OPERATIONAL') {
        return {
          id: recommendationId,
          constraintId: constraint.id,
          title: 'Stabilize the department before the constraint spreads',
          summary: constraint.name,
          rationale:
            'Department-level pressure usually means the bottleneck is no longer isolated. Capacity, priority, and handoff rules should be reviewed together.',
          urgency: constraint.severity >= 75 ? 'HIGH' : 'MEDIUM',
          status: persistedStatus ?? baseStatus,
          confidence: round(constraint.confidence),
          ownerSuggestion: 'Operations head',
          evidence: [
            `${constraint.severity}% operational pressure detected.`,
            `Average workforce confidence is ${workforce.summary.averageConfidence}%.`,
            'Department-level evidence indicates broad stress rather than a single isolated event.',
          ],
          actions: [
            'Limit new non-critical work entering the constrained department.',
            'Reallocate support staff from lower-pressure teams where possible.',
            'Run a daily bottleneck review until pressure returns to target.',
          ],
          linkedProcessKey: constraint.linkedProcessKey,
          type: constraint.type,
          governance,
        };
      }

      return null;
    })
    .filter((item): item is IntelligenceRecommendation => Boolean(item))
    .sort((a, b) => b.confidence - a.confidence);

  return {
    readinessStatus: readiness.status,
    recommendations,
    recentEvents,
  };
}

export async function updateRecommendationStatus(
  prisma: PrismaClient,
  tenantId: string,
  recommendationId: string,
  status: RecommendationStatus,
  options?: {
    note?: string | null;
    reviewedByUserId?: string | null;
  }
) {
  const settings = await getIntelligenceSettings(prisma, tenantId);
  const existingGovernance = settings.recommendationGovernanceById[recommendationId];
  const nextGovernance: RecommendationGovernanceEntry = {
    status,
    note: options?.note ?? existingGovernance?.note,
    reviewedAt: new Date().toISOString(),
    reviewedByUserId: options?.reviewedByUserId ?? existingGovernance?.reviewedByUserId,
  };

  return updateIntelligenceSettings(prisma, tenantId, {
    recommendationStatusById: {
      ...settings.recommendationStatusById,
      [recommendationId]: status,
    },
    recommendationGovernanceById: {
      ...settings.recommendationGovernanceById,
      [recommendationId]: nextGovernance,
    },
  });
}
