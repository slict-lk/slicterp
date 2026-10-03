import { PrismaClient } from '@prisma/client';
import { getActiveConstraints } from '@/lib/intelligence/constraints/constraint-service';
import { getIntelligenceRecommendations } from '@/lib/intelligence/recommendations/recommendation-service';
import { getLatestDataReadinessAudit } from '@/lib/intelligence/readiness/readiness-service';
import { getIntelligenceSettings } from '@/lib/intelligence/settings/intelligence-settings-service';
import {
  runSimulatorScenario,
  type ScenarioType,
} from '@/lib/intelligence/simulator/simulator-service';
import { getTocWorkspaceData } from '@/lib/intelligence/toc/toc-service';
import {
  getEmployeeSnapshotHistoryMap,
  getLatestWorkforceSnapshots,
  getWorkforceDashboardData,
} from '@/lib/intelligence/workforce/capacity-service';
import { listAuditTrail, logControlPlaneEvent } from '@/lib/ai/control-plane';
import { processUserMessage } from '@/lib/ai/chat-agent';

export type IntelligenceAIAudience = 'CEO' | 'HR' | 'OPERATIONS';
export type IntelligenceAIOutputType =
  | 'summary'
  | 'briefing'
  | 'explanation'
  | 'recommendation_draft'
  | 'chat_answer';

type IntelligenceChatFocus =
  | 'overview'
  | 'readiness'
  | 'workforce'
  | 'constraints'
  | 'toc'
  | 'simulator'
  | 'recommendations';

type IntelligenceEntityType = 'constraint' | 'employee' | 'tree';

type AuditRow = {
  id: string;
  action: string;
  summary: string;
  createdAt: string | Date;
  [key: string]: unknown;
};

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function isoOrNull(value: Date | string | null | undefined) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.toISOString();
}

function buildGateMessage(readinessStatus: string) {
  return `Intelligence AI is gated because data readiness is ${readinessStatus}. Run and pass the readiness audit before asking AI to summarize or explain operational decisions.`;
}

function confidenceBand(value: number) {
  if (value >= 85) return 'HIGH';
  if (value >= 65) return 'MEDIUM';
  return 'LOW';
}

function truncate(value: string, max = 220) {
  return value.length > max ? `${value.slice(0, max).trim()}...` : value;
}

export interface IntelligenceAIContext {
  readiness: {
    status: string;
    score: number;
    createdAt: string | null;
    warnings: string[];
  };
  gated: boolean;
  settings: {
    minimumProfileConfidence: number;
    minimumRecommendationConfidence: number;
    freshnessHours: number;
    requireHumanReview: boolean;
  };
  freshness: {
    workforce: string | null;
    constraints: string | null;
  };
  workforce: {
    summary: Awaited<ReturnType<typeof getWorkforceDashboardData>>['summary'];
    topProfiles: Array<{
      employeeId: string;
      name: string;
      position: string;
      departmentName: string | null;
      category: string;
      confidence: number;
      stressLoad: number;
      systemDependency: number;
      successionReadiness: number;
    }>;
  };
  constraints: {
    count: number;
    top: Array<{
      id: string;
      type: string;
      name: string;
      description: string | null;
      severity: number;
      confidence: number;
      linkedProcessKey: string | null;
      detectedAt: string | null;
    }>;
  };
  recommendations: {
    count: number;
    top: Array<{
      id: string;
      title: string;
      urgency: string;
      status: string;
      confidence: number;
      summary: string;
    }>;
  };
  toc: {
    readinessStatus: string;
    primaryConstraintName: string | null;
    trees: Array<{
      key: string;
      label: string;
      description: string;
    }>;
  };
  explanationOptions: {
    constraints: Array<{ id: string; label: string }>;
    employees: Array<{ id: string; label: string }>;
    trees: Array<{ id: string; label: string }>;
  };
  suggestedPrompts: string[];
}

async function assembleContext(prisma: PrismaClient, tenantId: string): Promise<IntelligenceAIContext> {
  const [readiness, settings, workforce, snapshots, constraints, recommendations, toc] = await Promise.all([
    getLatestDataReadinessAudit(prisma, tenantId),
    getIntelligenceSettings(prisma, tenantId),
    getWorkforceDashboardData(prisma, tenantId),
    getLatestWorkforceSnapshots(prisma, tenantId),
    getActiveConstraints(prisma, tenantId),
    getIntelligenceRecommendations(prisma, tenantId),
    getTocWorkspaceData(prisma, tenantId),
  ]);

  const topProfiles = snapshots
    .slice()
    .sort((a, b) => {
      const aRisk = a.stressLoad + a.systemDependency - a.successionReadiness;
      const bRisk = b.stressLoad + b.systemDependency - b.successionReadiness;
      return bRisk - aRisk;
    })
    .slice(0, 6)
    .map((snapshot) => ({
      employeeId: snapshot.employeeId,
      name: `${snapshot.firstName} ${snapshot.lastName}`,
      position: snapshot.position,
      departmentName: snapshot.departmentName,
      category: snapshot.category,
      confidence: snapshot.confidence,
      stressLoad: snapshot.stressLoad,
      systemDependency: snapshot.systemDependency,
      successionReadiness: snapshot.successionReadiness,
    }));

  return {
    readiness: {
      status: readiness?.status ?? 'BLOCKED',
      score: readiness?.score ?? 0,
      createdAt: isoOrNull(readiness?.createdAt),
      warnings: Array.isArray(readiness?.warnings) ? (readiness?.warnings as string[]) : [],
    },
    gated: !readiness || readiness.status !== 'PASS',
    settings: {
      minimumProfileConfidence: settings.minimumProfileConfidence,
      minimumRecommendationConfidence: settings.minimumRecommendationConfidence,
      freshnessHours: settings.freshnessHours,
      requireHumanReview: settings.requireHumanReview,
    },
    freshness: {
      workforce: isoOrNull(workforce.summary.latestGeneratedAt),
      constraints: isoOrNull(constraints[0]?.detectedAt ?? null),
    },
    workforce: {
      summary: workforce.summary,
      topProfiles,
    },
    constraints: {
      count: constraints.length,
      top: constraints.slice(0, 6).map((constraint) => ({
        id: constraint.id,
        type: constraint.type,
        name: constraint.name,
        description: constraint.description,
        severity: constraint.severity,
        confidence: constraint.confidence,
        linkedProcessKey: constraint.linkedProcessKey,
        detectedAt: isoOrNull(constraint.detectedAt),
      })),
    },
    recommendations: {
      count: recommendations.recommendations.length,
      top: recommendations.recommendations.slice(0, 6).map((recommendation) => ({
        id: recommendation.id,
        title: recommendation.title,
        urgency: recommendation.urgency,
        status: recommendation.status,
        confidence: recommendation.confidence,
        summary: recommendation.summary,
      })),
    },
    toc: {
      readinessStatus: toc.readinessStatus,
      primaryConstraintName: toc.primaryConstraint?.name ?? null,
      trees: toc.trees.map((tree) => ({
        key: tree.key,
        label: tree.label,
        description: tree.description,
      })),
    },
    explanationOptions: {
      constraints: constraints.slice(0, 12).map((constraint) => ({
        id: constraint.id,
        label: `${constraint.type}: ${constraint.name}`,
      })),
      employees: topProfiles.map((profile) => ({
        id: profile.employeeId,
        label: `${profile.name} · ${profile.position}`,
      })),
      trees: toc.trees.map((tree) => ({
        id: tree.key,
        label: tree.label,
      })),
    },
    suggestedPrompts: [
      'Summarize the most important organizational risks right now.',
      'Explain the primary operational constraint in simple language.',
      'What should leadership review before changing approvals?',
      'Which workforce signals look the least reliable today?',
    ],
  };
}

function buildContextDigest(context: IntelligenceAIContext) {
  return [
    `Readiness: ${context.readiness.status} (${context.readiness.score}%)`,
    `Workforce: ${context.workforce.summary.employeeCount} profiles, average stress ${context.workforce.summary.averageStressLoad}%, average confidence ${context.workforce.summary.averageConfidence}%`,
    `Constraints: ${context.constraints.count} active`,
    `Recommendations: ${context.recommendations.count} active`,
    `Primary TOC constraint: ${context.toc.primaryConstraintName ?? 'None'}`,
    `Top workforce risks: ${context.workforce.topProfiles.map((profile) => `${profile.name} (${profile.category}, stress ${profile.stressLoad}%)`).join('; ') || 'none'}`,
    `Top constraints: ${context.constraints.top.map((constraint) => `${constraint.name} (${constraint.severity}% severity, ${constraint.confidence}% confidence)`).join('; ') || 'none'}`,
    `Top recommendations: ${context.recommendations.top.map((recommendation) => `${recommendation.title} (${recommendation.urgency}, ${recommendation.confidence}% confidence)`).join('; ') || 'none'}`,
  ].join('\n');
}

async function runGroundedOutput(args: {
  prisma: PrismaClient;
  tenantId: string;
  userId: string;
  outputType: IntelligenceAIOutputType;
  audience: IntelligenceAIAudience;
  userPrompt: string;
  context: IntelligenceAIContext;
  sourceSections: string[];
}) {
  if (args.context.gated) {
    return {
      gated: true,
      content: buildGateMessage(args.context.readiness.status),
      confidence: 0,
      freshness: {
        readiness: args.context.readiness.createdAt,
        workforce: args.context.freshness.workforce,
        constraints: args.context.freshness.constraints,
      },
      sourceSections: ['readiness'],
      warnings: [buildGateMessage(args.context.readiness.status)],
      functionCalls: [] as any[],
    };
  }

  const prompt = [
    'You are the Organizational Intelligence AI inside a multi-tenant ERP.',
    `Audience: ${args.audience}`,
    `Output type: ${args.outputType}`,
    'You must only use the structured context provided below.',
    'Do not invent facts, scores, promotions, disciplinary actions, or restructuring decisions.',
    'If confidence or freshness is weak, say so directly.',
    'Always explain using business language grounded in evidence.',
    `Source sections allowed: ${args.sourceSections.join(', ')}`,
    '',
    'Structured intelligence context:',
    buildContextDigest(args.context),
    '',
    `User request: ${args.userPrompt}`,
  ].join('\n');

  const result = await processUserMessage(prompt, [], args.tenantId, args.userId, 1);
  const overallConfidence = round(
    Math.min(
      100,
      (args.context.workforce.summary.averageConfidence * 0.5) +
        (args.context.constraints.top[0]?.confidence ?? 60) * 0.3 +
        args.context.readiness.score * 0.2
    )
  );

  await logControlPlaneEvent({
    tenantId: args.tenantId,
    integration: 'intelligence-ai',
    action: `intelligence-ai.${args.outputType}`,
    status: 'SUCCESS',
    requestData: {
      audience: args.audience,
      sourceSections: args.sourceSections,
      promptLength: args.userPrompt.length,
    },
    responseData: {
      confidence: overallConfidence,
      functionCalls: result.functionCalls || [],
    },
  });

  return {
    gated: false,
    content: result.response,
    confidence: overallConfidence,
    freshness: {
      readiness: args.context.readiness.createdAt,
      workforce: args.context.freshness.workforce,
      constraints: args.context.freshness.constraints,
    },
    sourceSections: args.sourceSections,
    warnings: args.context.readiness.warnings,
    functionCalls: result.functionCalls || [],
  };
}

export async function getIntelligenceAIContext(prisma: PrismaClient, tenantId: string) {
  return assembleContext(prisma, tenantId);
}

export async function generateExecutiveBriefing(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  audience: IntelligenceAIAudience = 'CEO',
  timeRange = 'current'
) {
  const context = await assembleContext(prisma, tenantId);
  const userPrompt =
    audience === 'HR'
      ? `Write an HR-focused organizational briefing for the ${timeRange} period. Cover succession, stress, dependency, and what HR should review next.`
      : audience === 'OPERATIONS'
        ? `Write an operations-focused briefing for the ${timeRange} period. Focus on active bottlenecks, throughput risk, approval delays, and next operational actions.`
        : `Write a CEO-level executive briefing for the ${timeRange} period. Focus on top business risks, primary constraints, workforce pressure, and leadership actions.`;

  const output = await runGroundedOutput({
    prisma,
    tenantId,
    userId,
    outputType: 'briefing',
    audience,
    userPrompt,
    context,
    sourceSections: ['readiness', 'workforce', 'constraints', 'recommendations', 'toc'],
  });

  return {
    audience,
    timeRange,
    title: `${audience} briefing`,
    ...output,
  };
}

export async function explainIntelligenceEntity(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  input: {
    surface: IntelligenceChatFocus;
    entityType?: IntelligenceEntityType;
    entityId?: string | null;
  }
) {
  const context = await assembleContext(prisma, tenantId);
  let entityPrompt = '';
  let sourceSections: string[] = ['readiness'];

  if (input.entityType === 'constraint' && input.entityId) {
    const constraint = context.constraints.top.find((item) => item.id === input.entityId);
    if (constraint) {
      entityPrompt = `Explain this operational constraint in plain business language: ${constraint.name}. Severity ${constraint.severity}%, confidence ${constraint.confidence}%, process key ${constraint.linkedProcessKey ?? 'not mapped'}.`;
      sourceSections = ['constraints', 'recommendations', 'toc'];
    }
  } else if (input.entityType === 'employee' && input.entityId) {
    const employee = context.workforce.topProfiles.find((item) => item.employeeId === input.entityId);
    if (employee) {
      entityPrompt = `Explain why this workforce profile stands out: ${employee.name}, ${employee.position}, stress ${employee.stressLoad}%, dependency ${employee.systemDependency}%, succession ${employee.successionReadiness}%, category ${employee.category}.`;
      sourceSections = ['workforce', 'readiness'];
    }
  } else if (input.entityType === 'tree' && input.entityId) {
    const tree = context.toc.trees.find((item) => item.key === input.entityId);
    if (tree) {
      entityPrompt = `Explain the purpose of the ${tree.label} and what business question it answers in the current tenant context.`;
      sourceSections = ['toc', 'constraints', 'recommendations'];
    }
  }

  const fallbackPrompt = `Explain the current ${input.surface} state in simple business language, including what leadership should pay attention to next.`;

  const output = await runGroundedOutput({
    prisma,
    tenantId,
    userId,
    outputType: 'explanation',
    audience: input.surface === 'workforce' ? 'HR' : 'OPERATIONS',
    userPrompt: entityPrompt || fallbackPrompt,
    context,
    sourceSections,
  });

  return {
    surface: input.surface,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    ...output,
  };
}

export async function chatWithIntelligenceAI(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  input: {
    message: string;
    focus?: IntelligenceChatFocus;
    audience?: IntelligenceAIAudience;
  }
) {
  const context = await assembleContext(prisma, tenantId);
  const focus = input.focus ?? 'overview';
  const focusPrompt =
    focus === 'readiness'
      ? 'Answer only from readiness and data quality context.'
      : focus === 'workforce'
        ? 'Answer only from workforce and profile context.'
        : focus === 'constraints'
          ? 'Answer only from constraint and bottleneck context.'
          : focus === 'toc'
            ? 'Answer only from TOC reasoning context.'
            : focus === 'simulator'
              ? 'Answer only from currently available simulation and recommendation context.'
              : focus === 'recommendations'
                ? 'Answer only from current recommendation and approval-governance context.'
                : 'Answer from the full intelligence context.';

  const output = await runGroundedOutput({
    prisma,
    tenantId,
    userId,
    outputType: 'chat_answer',
    audience: input.audience ?? 'CEO',
    userPrompt: `${focusPrompt}\nUser message: ${input.message}`,
    context,
    sourceSections:
      focus === 'readiness'
        ? ['readiness']
        : focus === 'workforce'
          ? ['workforce', 'readiness']
          : focus === 'constraints'
            ? ['constraints', 'workforce']
            : focus === 'toc'
              ? ['toc', 'constraints', 'recommendations']
              : focus === 'simulator'
                ? ['constraints', 'recommendations', 'workforce']
                : focus === 'recommendations'
                  ? ['recommendations', 'constraints']
                  : ['readiness', 'workforce', 'constraints', 'recommendations', 'toc'],
  });

  return {
    focus,
    ...output,
  };
}

export async function getIntelligenceAISummary(prisma: PrismaClient, tenantId: string, userId: string) {
  const context = await assembleContext(prisma, tenantId);
  const output = await runGroundedOutput({
    prisma,
    tenantId,
    userId,
    outputType: 'summary',
    audience: 'CEO',
    userPrompt:
      'Write a concise executive summary of the current organizational intelligence state. Keep it short, grounded, and action-oriented.',
    context,
    sourceSections: ['readiness', 'workforce', 'constraints', 'recommendations'],
  });

  return {
    headline:
      context.constraints.top[0]?.name ??
      'No primary constraint is active yet',
    ...output,
  };
}

export async function getIntelligenceAIAudit(tenantId: string) {
  const rows = await listAuditTrail(tenantId);
  return (rows as unknown as AuditRow[]).filter((row) => row.action?.startsWith('intelligence-ai.'));
}

export async function simulateWithAIInterpretation(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  input: {
    scenarioType: ScenarioType;
    employeeId?: string | null;
    departmentName?: string | null;
    workloadChangePercent?: number | null;
    approvalDelegationThreshold?: number | null;
    branchCount?: number | null;
  }
) {
  const simulation = await runSimulatorScenario(prisma, tenantId, input);
  const context = await assembleContext(prisma, tenantId);

  const interpretation = await runGroundedOutput({
    prisma,
    tenantId,
    userId,
    outputType: 'explanation',
    audience: 'OPERATIONS',
    userPrompt: `Interpret this simulation result in business language. Scenario: ${input.scenarioType}. Before stress ${simulation.before.averageStress}%, after ${simulation.after.averageStress}%, critical risk delta ${simulation.delta.criticalRiskCount}.`,
    context,
    sourceSections: ['workforce', 'constraints', 'recommendations'],
  });

  return {
    simulation,
    interpretation,
  };
}

export async function getExplanationSeedData(prisma: PrismaClient, tenantId: string) {
  const context = await assembleContext(prisma, tenantId);
  const history = await getEmployeeSnapshotHistoryMap(prisma, tenantId, 4);

  return {
    options: context.explanationOptions,
    preview: {
      topConstraint: context.constraints.top[0] ?? null,
      topEmployee: context.workforce.topProfiles[0] ?? null,
      employeeHistorySample:
        context.workforce.topProfiles[0] && history[context.workforce.topProfiles[0].employeeId]
          ? history[context.workforce.topProfiles[0].employeeId]
          : [],
    },
  };
}

export async function getIntelligenceRecommendationDraft(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  recommendationId: string
) {
  const context = await assembleContext(prisma, tenantId);
  const recommendation = context.recommendations.top.find((item) => item.id === recommendationId);
  const prompt = recommendation
    ? `Rewrite this recommendation for an executive audience. Title: ${recommendation.title}. Urgency: ${recommendation.urgency}. Summary: ${recommendation.summary}.`
    : 'Draft a concise executive recommendation from the current intelligence findings.';

  const output = await runGroundedOutput({
    prisma,
    tenantId,
    userId,
    outputType: 'recommendation_draft',
    audience: 'CEO',
    userPrompt: prompt,
    context,
    sourceSections: ['recommendations', 'constraints', 'workforce'],
  });

  return {
    recommendationId,
    ...output,
  };
}
