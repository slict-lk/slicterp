import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

export interface OperationalEventInput {
  tenantId: string;
  moduleKey: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string | null;
  employeeId?: string | null;
  occurredAt?: Date;
  durationMs?: number | null;
  metadata?: Record<string, unknown> | null;
}

export type OperationalEventRecord = {
  id: string;
  tenantId: string;
  moduleKey: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string | null;
  employeeId: string | null;
  occurredAt: Date;
  durationMs: number | null;
  metadata: Record<string, unknown> | null;
};

export async function recordOperationalEvent(
  prisma: PrismaClient,
  input: OperationalEventInput
) {
  const eventId = randomUUID();

  await prisma.$executeRaw`
    INSERT INTO "OperationalEvent" (
      "id",
      "tenantId",
      "moduleKey",
      "entityType",
      "entityId",
      "action",
      "actorUserId",
      "employeeId",
      "occurredAt",
      "durationMs",
      "metadata"
    )
    VALUES (
      ${eventId},
      ${input.tenantId},
      ${input.moduleKey},
      ${input.entityType},
      ${input.entityId},
      ${input.action},
      ${input.actorUserId ?? null},
      ${input.employeeId ?? null},
      ${input.occurredAt ?? new Date()},
      ${input.durationMs ?? null},
      ${JSON.stringify(input.metadata ?? null)}::jsonb
    )
  `;

  return eventId;
}

export async function listOperationalEvents(
  prisma: PrismaClient,
  tenantId: string,
  options?: {
    limit?: number;
    moduleKey?: string;
    entityType?: string;
    entityId?: string;
    employeeId?: string;
  }
) {
  const limit = options?.limit ?? 20;

  let rows: OperationalEventRecord[] = [];

  if (options?.entityType && options?.entityId) {
    rows = await prisma.$queryRaw<OperationalEventRecord[]>`
      SELECT *
      FROM "OperationalEvent"
      WHERE "tenantId" = ${tenantId}
        AND "entityType" = ${options.entityType}
        AND "entityId" = ${options.entityId}
      ORDER BY "occurredAt" DESC
      LIMIT ${limit}
    `;
  } else if (options?.employeeId) {
    rows = await prisma.$queryRaw<OperationalEventRecord[]>`
      SELECT *
      FROM "OperationalEvent"
      WHERE "tenantId" = ${tenantId}
        AND "employeeId" = ${options.employeeId}
      ORDER BY "occurredAt" DESC
      LIMIT ${limit}
    `;
  } else if (options?.moduleKey) {
    rows = await prisma.$queryRaw<OperationalEventRecord[]>`
      SELECT *
      FROM "OperationalEvent"
      WHERE "tenantId" = ${tenantId}
        AND "moduleKey" = ${options.moduleKey}
      ORDER BY "occurredAt" DESC
      LIMIT ${limit}
    `;
  } else {
    rows = await prisma.$queryRaw<OperationalEventRecord[]>`
      SELECT *
      FROM "OperationalEvent"
      WHERE "tenantId" = ${tenantId}
      ORDER BY "occurredAt" DESC
      LIMIT ${limit}
    `;
  }

  return rows;
}
