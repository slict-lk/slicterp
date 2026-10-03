import { PrismaClient } from '@prisma/client';
import { generateExecutiveBriefing } from '@/lib/intelligence/ai/intelligence-ai-service';
import { runConstraintScan } from '@/lib/intelligence/constraints/constraint-service';
import {
  getIntelligenceSettings,
  updateIntelligenceSettings,
} from '@/lib/intelligence/settings/intelligence-settings-service';
import { generateEmployeeCapacitySnapshots } from '@/lib/intelligence/workforce/capacity-service';

type RuntimeBriefingRecord = {
  audience: 'CEO' | 'HR' | 'OPERATIONS';
  content: string;
  confidence: number;
  createdAt: string;
  gated: boolean;
};

type RuntimeSnapshot = {
  lastRunAt: string | null;
  lastRunStatus: 'IDLE' | 'SUCCESS' | 'FAILED';
  lastRunMessage: string | null;
  lastSnapshotCount: number;
  lastConstraintCount: number;
  briefings: RuntimeBriefingRecord[];
};

function normalizeRuntime(value: unknown): RuntimeSnapshot {
  const source =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};

  return {
    lastRunAt: typeof source.lastRunAt === 'string' ? source.lastRunAt : null,
    lastRunStatus:
      source.lastRunStatus === 'SUCCESS' || source.lastRunStatus === 'FAILED' || source.lastRunStatus === 'IDLE'
        ? source.lastRunStatus
        : 'IDLE',
    lastRunMessage: typeof source.lastRunMessage === 'string' ? source.lastRunMessage : null,
    lastSnapshotCount: typeof source.lastSnapshotCount === 'number' ? source.lastSnapshotCount : 0,
    lastConstraintCount: typeof source.lastConstraintCount === 'number' ? source.lastConstraintCount : 0,
    briefings: Array.isArray(source.briefings)
      ? source.briefings.filter((item): item is RuntimeBriefingRecord => {
          return (
            typeof item === 'object' &&
            item !== null &&
            (item as RuntimeBriefingRecord).audience !== undefined &&
            typeof (item as RuntimeBriefingRecord).content === 'string'
          );
        })
      : [],
  };
}

async function readRuntime(prisma: PrismaClient, tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  const settings = ((tenant?.settings as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const intelligence = ((settings.organizationalIntelligence as Record<string, unknown> | null) ?? {}) as Record<
    string,
    unknown
  >;

  return normalizeRuntime(intelligence.runtime);
}

async function writeRuntime(prisma: PrismaClient, tenantId: string, runtime: RuntimeSnapshot) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  const rootSettings = ((tenant?.settings as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const intelligence = ((rootSettings.organizationalIntelligence as Record<string, unknown> | null) ?? {}) as Record<
    string,
    unknown
  >;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...rootSettings,
        organizationalIntelligence: {
          ...intelligence,
          runtime,
        },
      } as any,
    },
  });

  return runtime;
}

export async function getIntelligenceRuntimeStatus(prisma: PrismaClient, tenantId: string) {
  const [settings, runtime] = await Promise.all([
    getIntelligenceSettings(prisma, tenantId),
    readRuntime(prisma, tenantId),
  ]);

  return {
    autoRunSnapshots: settings.autoRunSnapshots,
    autoRunConstraintScan: settings.autoRunConstraintScan,
    freshnessHours: settings.freshnessHours,
    ...runtime,
  };
}

async function resolvePipelineActorUserId(prisma: PrismaClient, tenantId: string, preferredUserId?: string | null) {
  if (preferredUserId) return preferredUserId;

  const user = await prisma.user.findFirst({
    where: {
      tenantId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new Error('No active tenant user is available to run the intelligence pipeline.');
  }

  return user.id;
}

export async function runIntelligencePipeline(
  prisma: PrismaClient,
  tenantId: string,
  userId?: string | null
) {
  const runtime = await readRuntime(prisma, tenantId);
  const startedAt = new Date().toISOString();

  try {
    const actorUserId = await resolvePipelineActorUserId(prisma, tenantId, userId);
    const snapshots = await generateEmployeeCapacitySnapshots(prisma, tenantId);
    const constraints = await runConstraintScan(prisma, tenantId);
    const briefings = await Promise.all([
      generateExecutiveBriefing(prisma, tenantId, actorUserId, 'CEO', 'current'),
      generateExecutiveBriefing(prisma, tenantId, actorUserId, 'HR', 'current'),
      generateExecutiveBriefing(prisma, tenantId, actorUserId, 'OPERATIONS', 'current'),
    ]);

    const nextRuntime: RuntimeSnapshot = {
      ...runtime,
      lastRunAt: startedAt,
      lastRunStatus: 'SUCCESS',
      lastRunMessage: 'Intelligence pipeline completed successfully.',
      lastSnapshotCount: snapshots.length,
      lastConstraintCount: constraints.length,
      briefings: briefings.map((briefing) => ({
        audience: briefing.audience,
        content: briefing.content,
        confidence: briefing.confidence,
        createdAt: startedAt,
        gated: briefing.gated,
      })),
    };

    await writeRuntime(prisma, tenantId, nextRuntime);
    return nextRuntime;
  } catch (error) {
    const nextRuntime: RuntimeSnapshot = {
      ...runtime,
      lastRunAt: startedAt,
      lastRunStatus: 'FAILED',
      lastRunMessage: error instanceof Error ? error.message : 'Intelligence pipeline failed.',
      briefings: runtime.briefings,
      lastSnapshotCount: runtime.lastSnapshotCount,
      lastConstraintCount: runtime.lastConstraintCount,
    };

    await writeRuntime(prisma, tenantId, nextRuntime);
    throw error;
  }
}

export async function runScheduledIntelligencePipelines(prisma: PrismaClient) {
  const tenants = await prisma.tenant.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  });

  const results: Array<{
    tenantId: string;
    status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
    message: string;
  }> = [];

  for (const tenant of tenants) {
    const settings = await getIntelligenceSettings(prisma, tenant.id);
    if (!settings.autoRunSnapshots && !settings.autoRunConstraintScan) {
      results.push({
        tenantId: tenant.id,
        status: 'SKIPPED',
        message: 'Automation toggles are disabled.',
      });
      continue;
    }

    try {
      await runIntelligencePipeline(prisma, tenant.id, null);
      results.push({
        tenantId: tenant.id,
        status: 'SUCCESS',
        message: 'Pipeline completed.',
      });
    } catch (error) {
      results.push({
        tenantId: tenant.id,
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Pipeline failed.',
      });
    }
  }

  return results;
}

export async function syncIntelligenceAutomationSettings(
  prisma: PrismaClient,
  tenantId: string,
  input: {
    autoRunSnapshots?: boolean;
    autoRunConstraintScan?: boolean;
  }
) {
  return updateIntelligenceSettings(prisma, tenantId, {
    autoRunSnapshots: input.autoRunSnapshots,
    autoRunConstraintScan: input.autoRunConstraintScan,
  });
}
