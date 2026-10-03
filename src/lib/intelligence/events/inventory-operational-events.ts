import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { recordOperationalEvent } from '@/lib/intelligence/events/operational-event-service';

interface InventoryOperationalEventInput {
  tenantId: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  occurredAt?: Date;
  durationMs?: number | null;
  metadata?: Record<string, unknown> | null;
}

export async function recordInventoryOperationalEvent(
  input: InventoryOperationalEventInput
) {
  try {
    await recordOperationalEvent(prisma, {
      tenantId: input.tenantId,
      moduleKey: 'inventory',
      entityType: input.entityType,
      entityId: input.entityId || `${input.entityType}:${randomUUID()}`,
      action: input.action,
      occurredAt: input.occurredAt,
      durationMs: input.durationMs,
      metadata: {
        ...(input.metadata ?? {}),
        source: 'inventory-api',
      },
    });
  } catch (error) {
    console.warn('[OperationalEvent] Failed to record inventory event', {
      entityType: input.entityType,
      action: input.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
