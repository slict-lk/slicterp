import { publishDomainEvent } from '@/lib/ai/control-plane';
import type { DomainModule } from '@/lib/ai/control-plane-types';
import { prisma } from '@/lib/prisma';
import { recordOperationalEvent } from '@/lib/intelligence/events/operational-event-service';

function inferEntityId(entity: string, payload: Record<string, unknown>) {
  const directId = payload.id;
  if (typeof directId === 'string' && directId.trim()) return directId;

  const entityIdKey = `${entity}Id`;
  const entityId = payload[entityIdKey];
  if (typeof entityId === 'string' && entityId.trim()) return entityId;

  const fallbackKeys = [
    'entityId',
    'recordId',
    'orderId',
    'invoiceId',
    'customerId',
    'leadId',
    'opportunityId',
    'productId',
    'taskId',
  ];

  for (const key of fallbackKeys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  return `${entity}:${crypto.randomUUID()}`;
}

export async function publishModuleMutationEvent(args: {
  tenantId: string;
  module: DomainModule;
  entity: string;
  event: string;
  actorId: string;
  payload: Record<string, unknown>;
  correlationId?: string;
}) {
  const event = await publishDomainEvent({
    id: `evt-${args.module}-${args.entity}-${crypto.randomUUID()}`,
    tenantId: args.tenantId,
    module: args.module,
    entity: args.entity,
    event: args.event,
    occurredAt: new Date().toISOString(),
    actorType: 'user',
    actorId: args.actorId,
    correlationId: args.correlationId || `corr-${args.module}-${args.entity}-${crypto.randomUUID()}`,
    payload: args.payload,
  });

  try {
    await recordOperationalEvent(prisma, {
      tenantId: args.tenantId,
      moduleKey: args.module,
      entityType: args.entity,
      entityId: inferEntityId(args.entity, args.payload),
      action: args.event,
      actorUserId: args.actorId,
      metadata: {
        payload: args.payload,
        correlationId: args.correlationId ?? null,
        source: 'ai-module-events',
      },
    });
  } catch (error) {
    console.warn('[OperationalEvent] Failed to mirror module mutation event', {
      module: args.module,
      entity: args.entity,
      event: args.event,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return event;
}
