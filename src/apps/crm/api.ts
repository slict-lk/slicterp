import { prisma } from '@/lib/prisma';
import { bootstrapSalesCrmTenant } from '@/lib/sales-crm/bootstrap';
import {
  recordLeadStageHistory,
  recordOpportunityStageHistory,
  validateStageEditRestrictions,
  validateStageTransition,
  writeCrmAuditEvent,
} from './workflow';

const client = prisma as any;

function withTenant<T extends Record<string, unknown>>(tenantId: string, where?: T) {
  return { tenantId, ...(where || {}) };
}

async function resolvePipelineAndStageDefaults(
  tenantId: string,
  pipelineId?: string | null,
  stageId?: string | null
) {
  if (pipelineId && stageId) {
    return { pipelineId, stageId };
  }

  await bootstrapSalesCrmTenant(tenantId);

  if (stageId && !pipelineId) {
    const stage = await client.crmStage.findFirst({
      where: { id: stageId, tenantId },
      select: { id: true, pipelineId: true },
    });
    if (stage) return { pipelineId: stage.pipelineId, stageId: stage.id };
  }

  const pipeline = pipelineId
    ? await client.crmPipeline.findFirst({ where: { id: pipelineId, tenantId } })
    : await client.crmPipeline.findFirst({
        where: { tenantId, isDefault: true },
        orderBy: { createdAt: 'asc' },
      });

  if (!pipeline) return { pipelineId: pipelineId ?? null, stageId: stageId ?? null };

  const stage = stageId
    ? await client.crmStage.findFirst({ where: { id: stageId, tenantId, pipelineId: pipeline.id } })
    : await client.crmStage.findFirst({
        // CrmStage has no active/isActive flag in the current schema.
        // Default to the first non-closed stage in sequence order.
        where: { tenantId, pipelineId: pipeline.id, isClosed: false },
        orderBy: { sequence: 'asc' },
      });

  return {
    pipelineId: pipeline.id,
    stageId: stage?.id ?? null,
  };
}

export async function listPipelines(tenantId: string) {
  let pipelines = await client.crmPipeline.findMany({
    where: { tenantId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  if (pipelines.length === 0) {
    await bootstrapSalesCrmTenant(tenantId);
    pipelines = await client.crmPipeline.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }
  const pipelineIds = pipelines.map((p: any) => p.id);
  const stages = pipelineIds.length
    ? await client.crmStage.findMany({
        where: { tenantId, pipelineId: { in: pipelineIds } },
        orderBy: [{ pipelineId: 'asc' }, { sequence: 'asc' }],
      })
    : [];
  const stagesByPipeline = new Map<string, any[]>();
  for (const stage of stages) {
    if (!stagesByPipeline.has(stage.pipelineId)) stagesByPipeline.set(stage.pipelineId, []);
    stagesByPipeline.get(stage.pipelineId)!.push(stage);
  }
  return pipelines.map((pipeline: any) => ({
    ...pipeline,
    stages: stagesByPipeline.get(pipeline.id) ?? [],
  }));
}

export async function createPipeline(tenantId: string, data: any) {
  return client.crmPipeline.create({
    data: {
      tenantId,
      branchId: data.branchId ?? null,
      name: data.name,
      code: data.code ?? null,
      isDefault: !!data.isDefault,
      active: data.active ?? true,
      allowStageSkip: !!data.allowStageSkip,
      allowBackwardMove: data.allowBackwardMove ?? true,
      requireStageApproval: !!data.requireStageApproval,
      metadata: data.metadata ?? null,
    },
  });
}

export async function listLeads(tenantId: string, filters?: any) {
  const where: any = withTenant(tenantId);
  if (filters?.status) where.status = filters.status;
  if (filters?.ownerUserId) where.ownerUserId = filters.ownerUserId;
  if (filters?.pipelineId) where.pipelineId = filters.pipelineId;
  if (filters?.stageId) where.stageId = filters.stageId;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { company: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search } },
    ];
  }
  return client.crmLead.findMany({ where, orderBy: { updatedAt: 'desc' } });
}

export async function createLead(tenantId: string, userId: string | undefined, data: any) {
  const defaults = await resolvePipelineAndStageDefaults(tenantId, data.pipelineId ?? null, data.stageId ?? null);
  if (defaults.stageId) {
    await validateStageTransition({
      tenantId,
      pipelineId: defaults.pipelineId,
      toStageId: defaults.stageId,
      approvalGranted: !!(data.approvalGranted || data.stageApprovalGranted),
      bypassStageApproval: !!data.bypassStageApproval,
    });
  }
  const lead = await client.crmLead.create({
    data: {
      tenantId,
      branchId: data.branchId ?? null,
      pipelineId: defaults.pipelineId,
      stageId: defaults.stageId,
      customerAccountId: data.customerAccountId ?? null,
      partyId: data.partyId ?? null,
      ownerUserId: data.ownerUserId ?? userId ?? null,
      source: data.source ?? null,
      title: data.title ?? null,
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      company: data.company ?? null,
      jobTitle: data.jobTitle ?? null,
      status: data.status ?? 'NEW',
      priority: data.priority ?? 'MEDIUM',
      score: Number(data.score ?? 0),
      expectedRevenue: data.expectedRevenue != null ? Number(data.expectedRevenue) : null,
      probabilityPercent: data.probabilityPercent != null ? Number(data.probabilityPercent) : null,
      nextActionAt: data.nextActionAt ? new Date(data.nextActionAt) : null,
      enteredStageAt: data.enteredStageAt ? new Date(data.enteredStageAt) : new Date(),
      notes: data.notes ?? null,
      metadata: data.metadata ?? null,
    },
  });

  if (lead.stageId) {
    await recordLeadStageHistory({
      tenantId,
      leadId: lead.id,
      pipelineId: lead.pipelineId,
      toStageId: lead.stageId,
      changedByUserId: userId ?? null,
      reason: 'Lead created',
    });
  }

  await writeCrmAuditEvent({
    tenantId,
    branchId: lead.branchId,
    entityType: 'LEAD',
    entityId: lead.id,
    action: 'CREATE',
    actorUserId: userId ?? null,
    summary: 'CRM lead created',
    afterSnapshot: lead,
  });

  return lead;
}

export async function getLeadById(tenantId: string, id: string) {
  return client.crmLead.findFirst({ where: { id, tenantId } });
}

export async function updateLead(
  tenantId: string,
  id: string,
  data: any,
  actor?: { userId?: string | null; actorName?: string | null }
) {
  const existing = await getLeadById(tenantId, id);
  if (!existing) throw new Error('Lead not found');

  const nextPipelineId = data.pipelineId !== undefined ? data.pipelineId : existing.pipelineId;
  const nextStageId = data.stageId !== undefined ? data.stageId : existing.stageId;
  const changedFields = Object.keys(data).filter((key) => data[key] !== undefined);
  const approvalGranted = !!(data.approvalGranted || data.stageApprovalGranted);
  const bypassStageApproval = !!data.bypassStageApproval;
  const bypassEditRestriction = !!data.bypassEditRestriction;

  await validateStageEditRestrictions({
    tenantId,
    stageId: existing.stageId,
    changedFields,
    isStageChange: data.stageId !== undefined && data.stageId !== existing.stageId,
    approvalGranted,
    bypassRestriction: bypassEditRestriction,
  });

  if (data.stageId !== undefined && data.stageId !== existing.stageId) {
    await validateStageTransition({
      tenantId,
      pipelineId: nextPipelineId,
      fromStageId: existing.stageId,
      toStageId: data.stageId,
      approvalGranted,
      bypassStageApproval,
    });
  }

  const updated = await client.crmLead.update({
    where: { id },
    data: {
      ...(data.branchId !== undefined && { branchId: data.branchId }),
      ...(data.pipelineId !== undefined && { pipelineId: data.pipelineId }),
      ...(data.stageId !== undefined && { stageId: data.stageId }),
      ...(data.customerAccountId !== undefined && { customerAccountId: data.customerAccountId }),
      ...(data.partyId !== undefined && { partyId: data.partyId }),
      ...(data.ownerUserId !== undefined && { ownerUserId: data.ownerUserId }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.company !== undefined && { company: data.company }),
      ...(data.jobTitle !== undefined && { jobTitle: data.jobTitle }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.score !== undefined && { score: Number(data.score) }),
      ...(data.expectedRevenue !== undefined && {
        expectedRevenue: data.expectedRevenue == null ? null : Number(data.expectedRevenue),
      }),
      ...(data.probabilityPercent !== undefined && {
        probabilityPercent: data.probabilityPercent == null ? null : Number(data.probabilityPercent),
      }),
      ...(data.nextActionAt !== undefined && {
        nextActionAt: data.nextActionAt ? new Date(data.nextActionAt) : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.metadata !== undefined && { metadata: data.metadata }),
    },
  });

  if (data.stageId !== undefined && data.stageId !== existing.stageId) {
    await recordLeadStageHistory({
      tenantId,
      leadId: id,
      pipelineId: nextPipelineId,
      fromStageId: existing.stageId,
      toStageId: nextStageId,
      changedByUserId: actor?.userId ?? null,
      reason: data.stageChangeReason ?? data.reason ?? null,
    });

    await client.crmLead.update({
      where: { id },
      data: { enteredStageAt: new Date() },
    });
  }

  await writeCrmAuditEvent({
    tenantId,
    branchId: updated.branchId,
    entityType: 'LEAD',
    entityId: updated.id,
    action: data.stageId !== undefined && data.stageId !== existing.stageId ? 'STAGE_CHANGE' : 'UPDATE',
    actorUserId: actor?.userId ?? null,
    actorName: actor?.actorName ?? null,
    summary:
      data.stageId !== undefined && data.stageId !== existing.stageId
        ? `Lead stage changed${existing.stageId ? '' : ' (initial set)'}`
        : 'CRM lead updated',
    beforeSnapshot: existing,
    afterSnapshot: updated,
    metadata:
      data.stageId !== undefined && data.stageId !== existing.stageId
        ? {
            fromStageId: existing.stageId ?? null,
            toStageId: nextStageId ?? null,
            pipelineId: nextPipelineId ?? null,
          }
        : null,
  });

  return updated;
}

export async function deleteLead(tenantId: string, id: string) {
  await client.crmLead.deleteMany({ where: { id, tenantId } });
  return { success: true };
}

export async function listOpportunities(tenantId: string, filters?: any) {
  const where: any = withTenant(tenantId);
  if (filters?.status) where.status = filters.status;
  if (filters?.pipelineId) where.pipelineId = filters.pipelineId;
  if (filters?.stageId) where.stageId = filters.stageId;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  const rows = await client.crmOpportunity.findMany({ where, orderBy: { updatedAt: 'desc' } });
  // Alias fields for UI compatibility: stage <- stageId, probability <- probabilityPercent,
  // expectedCloseDate kept as-is, amount kept as-is
  return rows.map((opp: any) => ({
    ...opp,
    stage: opp.stageId ?? opp.stage ?? null,
    probability: opp.probabilityPercent ?? opp.probability ?? 0,
  }));
}

export async function createOpportunity(tenantId: string, userId: string | undefined, data: any) {
  const defaults = await resolvePipelineAndStageDefaults(tenantId, data.pipelineId ?? null, data.stageId ?? null);
  if (defaults.stageId) {
    await validateStageTransition({
      tenantId,
      pipelineId: defaults.pipelineId,
      toStageId: defaults.stageId,
      approvalGranted: !!(data.approvalGranted || data.stageApprovalGranted),
      bypassStageApproval: !!data.bypassStageApproval,
    });
  }
  const opportunity = await client.crmOpportunity.create({
    data: {
      tenantId,
      branchId: data.branchId ?? null,
      pipelineId: defaults.pipelineId,
      stageId: defaults.stageId,
      customerAccountId: data.customerAccountId ?? null,
      partyId: data.partyId ?? null,
      leadId: data.leadId ?? null,
      ownerUserId: data.ownerUserId ?? userId ?? null,
      name: data.name,
      description: data.description ?? null,
      amount: Number(data.amount ?? data.expectedRevenue ?? 0),
      currency: data.currency ?? 'USD',
      probabilityPercent: Number(data.probabilityPercent ?? data.probability ?? 0),
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      status: data.status ?? 'OPEN',
      priority: data.priority ?? 'MEDIUM',
      nextActionAt: data.nextActionAt ? new Date(data.nextActionAt) : null,
      enteredStageAt: new Date(),
      approvalRequired: !!data.approvalRequired,
      metadata: data.metadata ?? null,
    },
  });

  if (opportunity.stageId) {
    await recordOpportunityStageHistory({
      tenantId,
      opportunityId: opportunity.id,
      pipelineId: opportunity.pipelineId,
      toStageId: opportunity.stageId,
      changedByUserId: userId ?? null,
      reason: 'Opportunity created',
    });
  }

  await writeCrmAuditEvent({
    tenantId,
    branchId: opportunity.branchId,
    entityType: 'OPPORTUNITY',
    entityId: opportunity.id,
    action: 'CREATE',
    actorUserId: userId ?? null,
    summary: 'CRM opportunity created',
    afterSnapshot: opportunity,
  });

  return opportunity;
}

export async function getOpportunityById(tenantId: string, id: string) {
  return client.crmOpportunity.findFirst({ where: { id, tenantId } });
}

export async function updateOpportunity(
  tenantId: string,
  id: string,
  data: any,
  actor?: { userId?: string | null; actorName?: string | null }
) {
  const existing = await getOpportunityById(tenantId, id);
  if (!existing) throw new Error('Opportunity not found');

  const nextPipelineId = data.pipelineId !== undefined ? data.pipelineId : existing.pipelineId;
  const nextStageId = data.stageId !== undefined ? data.stageId : existing.stageId;
  const changedFields = Object.keys(data).filter((key) => data[key] !== undefined);
  const approvalGranted = !!(data.approvalGranted || data.stageApprovalGranted);
  const bypassStageApproval = !!data.bypassStageApproval;
  const bypassEditRestriction = !!data.bypassEditRestriction;

  await validateStageEditRestrictions({
    tenantId,
    stageId: existing.stageId,
    changedFields,
    isStageChange: data.stageId !== undefined && data.stageId !== existing.stageId,
    approvalGranted,
    bypassRestriction: bypassEditRestriction,
  });

  if (data.stageId !== undefined && data.stageId !== existing.stageId) {
    await validateStageTransition({
      tenantId,
      pipelineId: nextPipelineId,
      fromStageId: existing.stageId,
      toStageId: data.stageId,
      approvalGranted,
      bypassStageApproval,
    });
  }

  const updated = await client.crmOpportunity.update({
    where: { id },
    data: {
      ...(data.branchId !== undefined && { branchId: data.branchId }),
      ...(data.pipelineId !== undefined && { pipelineId: data.pipelineId }),
      ...(data.stageId !== undefined && { stageId: data.stageId }),
      ...(data.customerAccountId !== undefined && { customerAccountId: data.customerAccountId }),
      ...(data.partyId !== undefined && { partyId: data.partyId }),
      ...(data.leadId !== undefined && { leadId: data.leadId }),
      ...(data.ownerUserId !== undefined && { ownerUserId: data.ownerUserId }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.amount !== undefined && { amount: Number(data.amount) }),
      ...(data.expectedRevenue !== undefined && { amount: Number(data.expectedRevenue) }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.probabilityPercent !== undefined && { probabilityPercent: Number(data.probabilityPercent) }),
      ...(data.probability !== undefined && { probabilityPercent: Number(data.probability) }),
      ...(data.expectedCloseDate !== undefined && {
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.nextActionAt !== undefined && {
        nextActionAt: data.nextActionAt ? new Date(data.nextActionAt) : null,
      }),
      ...(data.approvalRequired !== undefined && { approvalRequired: !!data.approvalRequired }),
      ...(data.metadata !== undefined && { metadata: data.metadata }),
    },
  });

  if (data.stageId !== undefined && data.stageId !== existing.stageId) {
    await recordOpportunityStageHistory({
      tenantId,
      opportunityId: id,
      pipelineId: nextPipelineId,
      fromStageId: existing.stageId,
      toStageId: nextStageId,
      changedByUserId: actor?.userId ?? null,
      reason: data.stageChangeReason ?? data.reason ?? null,
    });

    await client.crmOpportunity.update({
      where: { id },
      data: { enteredStageAt: new Date() },
    });
  }

  await writeCrmAuditEvent({
    tenantId,
    branchId: updated.branchId,
    entityType: 'OPPORTUNITY',
    entityId: updated.id,
    action: data.stageId !== undefined && data.stageId !== existing.stageId ? 'STAGE_CHANGE' : 'UPDATE',
    actorUserId: actor?.userId ?? null,
    actorName: actor?.actorName ?? null,
    summary:
      data.stageId !== undefined && data.stageId !== existing.stageId
        ? 'CRM opportunity stage changed'
        : 'CRM opportunity updated',
    beforeSnapshot: existing,
    afterSnapshot: updated,
    metadata:
      data.stageId !== undefined && data.stageId !== existing.stageId
        ? {
            fromStageId: existing.stageId ?? null,
            toStageId: nextStageId ?? null,
            pipelineId: nextPipelineId ?? null,
          }
        : null,
  });

  return updated;
}

export async function deleteOpportunity(tenantId: string, id: string) {
  await client.crmOpportunity.deleteMany({ where: { id, tenantId } });
  return { success: true };
}

export async function listActivities(tenantId: string, filters?: any) {
  const where: any = withTenant(tenantId);
  if (filters?.leadId) where.leadId = filters.leadId;
  if (filters?.opportunityId) where.opportunityId = filters.opportunityId;
  if (filters?.accountId) where.accountId = filters.accountId;
  if (filters?.status) where.status = filters.status;
  const limit = filters?.limit ? parseInt(String(filters.limit), 10) : undefined;
  const rows = await client.crmActivity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  });
  // Alias dueAt -> scheduledAt so UI pages that read scheduledAt work correctly
  return rows.map((a: any) => ({
    ...a,
    scheduledAt: a.scheduledAt ?? a.dueAt ?? null,
  }));
}

export async function createActivity(tenantId: string, userId: string | undefined, data: any) {
  return client.crmActivity.create({
    data: {
      tenantId,
      branchId: data.branchId ?? null,
      accountId: data.accountId ?? null,
      contactPartyId: data.contactPartyId ?? null,
      leadId: data.leadId ?? null,
      opportunityId: data.opportunityId ?? null,
      activityType: data.activityType ?? 'NOTE',
      subject: data.subject ?? null,
      description: data.description ?? null,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      status: data.status ?? 'OPEN',
      ownerUserId: data.ownerUserId ?? userId ?? null,
      createdByUserId: userId ?? null,
      metadata: data.metadata ?? null,
    },
  });
}

export async function listTasks(tenantId: string, filters?: any) {
  const where: any = withTenant(tenantId);
  if (filters?.status) where.status = filters.status;
  if (filters?.assignedToUserId) where.assignedToUserId = filters.assignedToUserId;
  if (filters?.leadId) where.leadId = filters.leadId;
  if (filters?.opportunityId) where.opportunityId = filters.opportunityId;
  return client.crmTask.findMany({ where, orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }] });
}

export async function createTask(tenantId: string, userId: string | undefined, data: any) {
  return client.crmTask.create({
    data: {
      tenantId,
      branchId: data.branchId ?? null,
      accountId: data.accountId ?? null,
      leadId: data.leadId ?? null,
      opportunityId: data.opportunityId ?? null,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority ?? 'MEDIUM',
      status: data.status ?? 'OPEN',
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      assignedToUserId: data.assignedToUserId ?? userId ?? null,
      createdByUserId: userId ?? null,
      metadata: data.metadata ?? null,
    },
  });
}

export async function listAccounts(tenantId: string, search?: string) {
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { accountCode: { contains: search, mode: 'insensitive' } },
      { customerType: { contains: search, mode: 'insensitive' } },
    ];
  }
  const accounts = await client.customerAccount.findMany({ where, orderBy: { createdAt: 'desc' } });

  // Manual join: fetch Party records for all accounts
  const partyIds = accounts.map((a: any) => a.partyId).filter(Boolean);
  const parties: any[] = partyIds.length
    ? await (client as any).party.findMany({ where: { id: { in: partyIds } } })
    : [];
  const partyMap = new Map(parties.map((p: any) => [p.id, p]));

  return accounts.map((a: any) => {
    const p = partyMap.get(a.partyId);
    return {
      ...a,
      party: p
        ? { name: p.displayName, email: p.primaryEmail, phone: p.primaryPhone }
        : null,
    };
  });
}

export async function createAccount(tenantId: string, data: any) {
  return client.customerAccount.create({
    data: {
      tenantId,
      partyId: data.partyId,
      accountCode: data.accountCode ?? null,
      status: data.status ?? 'ACTIVE',
      customerType: data.customerType ?? 'GENERAL',
      creditLimit: data.creditLimit != null ? Number(data.creditLimit) : 0,
      creditHold: !!data.creditHold,
      paymentTermsDays: data.paymentTermsDays != null ? Number(data.paymentTermsDays) : 0,
      defaultCurrency: data.defaultCurrency ?? 'USD',
      defaultBranchId: data.defaultBranchId ?? null,
      priceListCode: data.priceListCode ?? null,
      riskLevel: data.riskLevel ?? 'NORMAL',
      metadata: data.metadata ?? null,
    },
  });
}

export async function listContacts(tenantId: string, filters?: any) {
  const where: any = { tenantId };
  if (filters?.customerAccountId) where.customerAccountId = filters.customerAccountId;
  return client.customerContactLink.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function createContactLink(tenantId: string, data: any) {
  return client.customerContactLink.create({
    data: {
      tenantId,
      customerAccountId: data.customerAccountId,
      contactPartyId: data.contactPartyId,
      role: data.role ?? null,
      isPrimary: !!data.isPrimary,
      canApproveQuotes: !!data.canApproveQuotes,
      canApproveOrders: !!data.canApproveOrders,
    },
  });
}
