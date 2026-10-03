import { prisma } from '@/lib/prisma';

const client = prisma as any;

async function getStage(tenantId: string, stageId?: string | null) {
  if (!stageId) return null;
  return client.crmStage.findFirst({ where: { id: stageId, tenantId } });
}

async function getPipeline(tenantId: string, pipelineId?: string | null) {
  if (!pipelineId) return null;
  return client.crmPipeline.findFirst({ where: { id: pipelineId, tenantId } });
}

export async function validateStageTransition(args: {
  tenantId: string;
  pipelineId?: string | null;
  fromStageId?: string | null;
  toStageId?: string | null;
  approvalGranted?: boolean;
  bypassStageApproval?: boolean;
}) {
  const { tenantId, pipelineId, fromStageId, toStageId } = args;
  if (!toStageId) return;
  if (fromStageId && toStageId === fromStageId) return;

  const [pipeline, fromStage, toStage] = await Promise.all([
    getPipeline(tenantId, pipelineId),
    fromStageId ? getStage(tenantId, fromStageId) : Promise.resolve(null),
    getStage(tenantId, toStageId),
  ]);

  if (!toStage) throw new Error('Invalid CRM stage');
  const resolvedPipeline = pipeline ?? (await getPipeline(tenantId, toStage.pipelineId));
  if (!resolvedPipeline) return;

  const transitionNeedsApproval =
    !!resolvedPipeline.requireStageApproval || !!toStage.requiresApproval;
  if (transitionNeedsApproval && !args.approvalGranted && !args.bypassStageApproval) {
    throw new Error(
      `Stage transition to "${toStage.name}" requires approval`
    );
  }

  if (!fromStage) return;

  if (fromStage.pipelineId !== toStage.pipelineId) {
    throw new Error('Cross-pipeline stage transition is not allowed');
  }

  const movingForward = toStage.sequence > fromStage.sequence;
  const movingBackward = toStage.sequence < fromStage.sequence;
  const skipping = Math.abs(toStage.sequence - fromStage.sequence) > 1;

  if (movingBackward && !resolvedPipeline.allowBackwardMove) {
    throw new Error('Backward stage movement is restricted by pipeline rules');
  }
  if (movingForward && skipping && !resolvedPipeline.allowStageSkip) {
    throw new Error('Skipping pipeline stages is restricted by pipeline rules');
  }
}

export async function validateStageEditRestrictions(args: {
  tenantId: string;
  stageId?: string | null;
  changedFields: string[];
  isStageChange?: boolean;
  approvalGranted?: boolean;
  bypassRestriction?: boolean;
}) {
  const { tenantId, stageId, changedFields, isStageChange, approvalGranted, bypassRestriction } = args;
  if (!stageId || changedFields.length === 0) return;
  if (approvalGranted || bypassRestriction) return;

  const stage = await getStage(tenantId, stageId);
  if (!stage || !stage.editRestricted) return;

  const allowedInRestrictedStage = new Set([
    'stageId',
    'stageChangeReason',
    'reason',
    'approvalGranted',
    'stageApprovalGranted',
    'bypassStageApproval',
    'bypassEditRestriction',
    'nextActionAt',
    'notes',
    'metadata',
  ]);

  const blockedChanges = changedFields.filter((field) => !allowedInRestrictedStage.has(field));
  if (blockedChanges.length === 0) return;

  const prefix = isStageChange
    ? `Stage "${stage.name}" restricts editing during transition`
    : `Stage "${stage.name}" is edit-restricted`;
  throw new Error(`${prefix}: ${blockedChanges.join(', ')}`);
}

function calcDurationMinutes(start?: Date | null, end?: Date | null) {
  if (!start || !end) return null;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export async function recordLeadStageHistory(args: {
  tenantId: string;
  leadId: string;
  pipelineId?: string | null;
  fromStageId?: string | null;
  toStageId?: string | null;
  changedByUserId?: string | null;
  reason?: string | null;
}) {
  const { tenantId, leadId, pipelineId, fromStageId, toStageId, changedByUserId, reason } = args;
  const now = new Date();

  const openHistory = await client.crmLeadStageHistory.findFirst({
    where: { tenantId, leadId, exitedAt: null },
    orderBy: { enteredAt: 'desc' },
  });

  if (openHistory) {
    await client.crmLeadStageHistory.update({
      where: { id: openHistory.id },
      data: {
        exitedAt: now,
        durationMinutes: calcDurationMinutes(openHistory.enteredAt, now),
      },
    });
  }

  if (toStageId) {
    await client.crmLeadStageHistory.create({
      data: {
        tenantId,
        leadId,
        pipelineId: pipelineId ?? null,
        fromStageId: fromStageId ?? openHistory?.toStageId ?? null,
        toStageId,
        changedByUserId: changedByUserId ?? null,
        reason: reason ?? null,
        enteredAt: now,
      },
    });
  }
}

export async function recordOpportunityStageHistory(args: {
  tenantId: string;
  opportunityId: string;
  pipelineId?: string | null;
  fromStageId?: string | null;
  toStageId?: string | null;
  changedByUserId?: string | null;
  reason?: string | null;
}) {
  const { tenantId, opportunityId, pipelineId, fromStageId, toStageId, changedByUserId, reason } = args;
  const now = new Date();

  const openHistory = await client.crmOpportunityStageHistory.findFirst({
    where: { tenantId, opportunityId, exitedAt: null },
    orderBy: { enteredAt: 'desc' },
  });

  if (openHistory) {
    await client.crmOpportunityStageHistory.update({
      where: { id: openHistory.id },
      data: {
        exitedAt: now,
        durationMinutes: calcDurationMinutes(openHistory.enteredAt, now),
      },
    });
  }

  if (toStageId) {
    await client.crmOpportunityStageHistory.create({
      data: {
        tenantId,
        opportunityId,
        pipelineId: pipelineId ?? null,
        fromStageId: fromStageId ?? openHistory?.toStageId ?? null,
        toStageId,
        changedByUserId: changedByUserId ?? null,
        reason: reason ?? null,
        enteredAt: now,
      },
    });
  }
}

export async function writeCrmAuditEvent(args: {
  tenantId: string;
  branchId?: string | null;
  entityType: 'LEAD' | 'OPPORTUNITY';
  entityId: string;
  action: string;
  actorUserId?: string | null;
  actorName?: string | null;
  summary?: string | null;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
  metadata?: unknown;
}) {
  try {
    await client.salesAuditEvent.create({
      data: {
        tenantId: args.tenantId,
        branchId: args.branchId ?? null,
        entityType: args.entityType,
        entityId: args.entityId,
        action: args.action,
        actorUserId: args.actorUserId ?? null,
        actorName: args.actorName ?? null,
        summary: args.summary ?? null,
        beforeSnapshot: (args.beforeSnapshot as any) ?? null,
        afterSnapshot: (args.afterSnapshot as any) ?? null,
        metadata: (args.metadata as any) ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to write CRM audit event:', error);
  }
}
