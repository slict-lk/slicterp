import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { runDataCompatibilityAudit } from './data-compatibility-auditor';

type DataReadinessAuditRow = {
  id: string;
  tenantId: string;
  score: number;
  status: string;
  domains: unknown;
  details: unknown;
  warnings: unknown;
  actionItems: unknown;
  createdAt: Date;
};

export async function runAndPersistDataReadinessAudit(
  prisma: PrismaClient,
  tenantId: string
) {
  const result = await runDataCompatibilityAudit(prisma, tenantId);
  const auditId = randomUUID();

  const [audit] = await prisma.$queryRaw<DataReadinessAuditRow[]>`
    INSERT INTO "DataReadinessAudit" (
      "id",
      "tenantId",
      "score",
      "status",
      "domains",
      "details",
      "warnings",
      "actionItems"
    )
    VALUES (
      ${auditId},
      ${tenantId},
      ${result.dataReadinessIndex},
      ${result.activationGate},
      ${JSON.stringify(result.domains)}::jsonb,
      ${JSON.stringify(result.details)}::jsonb,
      ${JSON.stringify(result.warnings)}::jsonb,
      ${JSON.stringify(result.actionItems)}::jsonb
    )
    RETURNING
      "id",
      "tenantId",
      "score",
      "status",
      "domains",
      "details",
      "warnings",
      "actionItems",
      "createdAt"
  `;

  return {
    ...result,
    auditId: audit.id,
    createdAt: audit.createdAt.toISOString(),
  };
}

export async function getLatestDataReadinessAudit(
  prisma: PrismaClient,
  tenantId: string
) {
  const [audit] = await prisma.$queryRaw<DataReadinessAuditRow[]>`
    SELECT
      "id",
      "tenantId",
      "score",
      "status",
      "domains",
      "details",
      "warnings",
      "actionItems",
      "createdAt"
    FROM "DataReadinessAudit"
    WHERE "tenantId" = ${tenantId}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  return audit ?? null;
}

export async function getDataReadinessAuditHistory(
  prisma: PrismaClient,
  tenantId: string,
  take = 8
) {
  return prisma.$queryRaw<DataReadinessAuditRow[]>`
    SELECT
      "id",
      "tenantId",
      "score",
      "status",
      "domains",
      "details",
      "warnings",
      "actionItems",
      "createdAt"
    FROM "DataReadinessAudit"
    WHERE "tenantId" = ${tenantId}
    ORDER BY "createdAt" DESC
    LIMIT ${take}
  `;
}
