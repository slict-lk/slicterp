import { prisma } from '@/lib/prisma';
import {
  OperationalEventInput,
  recordOperationalEvent,
} from '@/lib/intelligence/events/operational-event-service';

export async function recordSafeOperationalEvent(
  input: Omit<OperationalEventInput, 'entityId'> & { entityId?: string | null }
) {
  try {
    await recordOperationalEvent(prisma, {
      ...input,
      entityId: input.entityId || `${input.entityType}:${crypto.randomUUID()}`,
      metadata: {
        ...(input.metadata ?? {}),
        safeRecorder: true,
      },
    });
  } catch (error) {
    console.warn('[OperationalEvent] Failed to record event', {
      moduleKey: input.moduleKey,
      entityType: input.entityType,
      action: input.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
