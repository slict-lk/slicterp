import prisma from '@/lib/prisma';

const client = prisma as any;

const DEFAULT_CRM_STAGES = [
  { name: 'Qualification', code: 'QUALIFICATION', sequence: 1, probabilityPercent: 10 },
  { name: 'Needs Analysis', code: 'NEEDS_ANALYSIS', sequence: 2, probabilityPercent: 25 },
  { name: 'Proposal', code: 'PROPOSAL', sequence: 3, probabilityPercent: 50 },
  { name: 'Negotiation', code: 'NEGOTIATION', sequence: 4, probabilityPercent: 75 },
  { name: 'Closed Won', code: 'CLOSED_WON', sequence: 5, probabilityPercent: 100, isClosed: true, isWon: true },
  { name: 'Closed Lost', code: 'CLOSED_LOST', sequence: 6, probabilityPercent: 0, isClosed: true, isWon: false },
];

export async function ensureDefaultBranch(tenantId: string) {
  const existing = await client.businessBranch.findFirst({
    where: { tenantId, isDefault: true },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;

  const anyBranch = await client.businessBranch.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
  });
  if (anyBranch) {
    return client.businessBranch.update({
      where: { id: anyBranch.id },
      data: { isDefault: true },
    });
  }

  return client.businessBranch.create({
    data: {
      tenantId,
      code: 'MAIN',
      name: 'Main Branch',
      isDefault: true,
      status: 'ACTIVE',
      currency: 'USD',
    },
  });
}

export async function ensureDefaultCrmPipeline(tenantId: string, branchId?: string | null) {
  let pipeline = await client.crmPipeline.findFirst({
    where: { tenantId, isDefault: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!pipeline) {
    pipeline = await client.crmPipeline.create({
      data: {
        tenantId,
        branchId: branchId ?? null,
        name: 'Default Sales Pipeline',
        code: 'DEFAULT_SALES',
        isDefault: true,
        active: true,
        allowStageSkip: false,
        allowBackwardMove: true,
        requireStageApproval: false,
      },
    });
  }

  const existingStages = await client.crmStage.findMany({
    where: { tenantId, pipelineId: pipeline.id },
    orderBy: { sequence: 'asc' },
  });

  if (existingStages.length === 0) {
    await client.crmStage.createMany({
      data: DEFAULT_CRM_STAGES.map((s) => ({
        tenantId,
        pipelineId: pipeline.id,
        name: s.name,
        code: s.code,
        sequence: s.sequence,
        probabilityPercent: s.probabilityPercent,
        isClosed: !!(s as any).isClosed,
        isWon: !!(s as any).isWon,
        requiresApproval: false,
        editRestricted: false,
      })),
    });
  }

  return pipeline;
}

export async function bootstrapSalesCrmTenant(tenantId: string) {
  const branch = await ensureDefaultBranch(tenantId);
  const pipeline = await ensureDefaultCrmPipeline(tenantId, branch.id);
  return { branch, pipeline };
}

export async function bootstrapSalesCrmAllTenants() {
  const tenants = await client.tenant.findMany({
    select: { id: true, subdomain: true, companyName: true },
    orderBy: { createdAt: 'asc' },
  });

  const results: Array<{ tenantId: string; branchId: string; pipelineId: string }> = [];
  for (const tenant of tenants) {
    const { branch, pipeline } = await bootstrapSalesCrmTenant(tenant.id);
    results.push({ tenantId: tenant.id, branchId: branch.id, pipelineId: pipeline.id });
  }
  return results;
}

