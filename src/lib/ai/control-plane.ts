import { prisma } from '@/lib/prisma';
import { createActivity, createTask as createCrmTask } from '@/apps/crm/api';
import { createEmployee } from '@/apps/hr/api';
import { createTask as createProjectTask } from '@/apps/projects/api';
import { createPurchaseOrder } from '@/apps/spareparts/api';
import { createCustomRecord } from '@/apps/studio/api';
import { assignVehiclesToShipment, updateVehicle } from '@/apps/vehicle-export/api';
import {
  buildDefaultSettings,
  buildDefaultTenantConfig,
  buildDefaultUserPreferences,
  mergeTenantAIConfig,
} from '@/lib/ai/control-plane-config';
import type {
  AIControlPlaneSettings,
  AIUserExperiencePreferences,
  ActionAdapter,
  AgentRecord,
  AgentCreateInput,
  AdapterExecutionContext,
  AuditEvidenceBundle,
  ApprovalStatus,
  ApprovalItem,
  AnalyticsPayload,
  AuditRecord,
  CommandCenterPayload,
  DomainEvent,
  DomainModule,
  EventRecord,
  ModelRecord,
  PolicyCategory,
  PolicyDecision,
  PredictiveInsight,
  PromptRecord,
  QueueItemStatus,
  RegistryItem,
  TenantAIConfig,
  WorkflowQueueItem,
  WorkflowSimulationResult,
  WorkflowTemplateRecord,
  WorkflowCreateInput,
  WorkflowDefinition,
  WorkflowVersionRecord,
} from '@/lib/ai/control-plane-types';
import { getActionUIMetadata, getModuleLabel } from '@/lib/ai/ui-metadata';

const db = prisma as any;
const TENANT_AI_SETTINGS_KEY = 'aiControlPlane';

function iso(value?: Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString();
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function attempt<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    console.error('[AI Control Plane] Falling back after query failure', error);
    return fallback;
  }
}

async function getTenantSettingsRecord(tenantId: string) {
  return attempt(
    async () =>
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      }),
    null
  );
}

export async function saveTenantAIConfig(tenantId: string, config: TenantAIConfig) {
  const existing = await getTenantSettingsRecord(tenantId);
  const rawSettings = (existing?.settings as Record<string, unknown> | null) || {};
  const nextSettings = {
    ...rawSettings,
    [TENANT_AI_SETTINGS_KEY]: config,
  };

  await db.tenant.update({
    where: { id: tenantId },
    data: { settings: nextSettings },
  });

  return config;
}

export async function getTenantAIConfig(tenantId: string): Promise<TenantAIConfig> {
  const defaults = buildDefaultTenantConfig(tenantId);
  const record = await getTenantSettingsRecord(tenantId);
  const storedConfig = (record?.settings as Record<string, unknown> | null)?.[
    TENANT_AI_SETTINGS_KEY
  ] as Partial<TenantAIConfig> | undefined;

  return mergeTenantAIConfig(defaults, storedConfig);
}

export async function updateTenantAIConfig(
  tenantId: string,
  patch: Partial<TenantAIConfig>
): Promise<TenantAIConfig> {
  const current = await getTenantAIConfig(tenantId);
  const next = mergeTenantAIConfig(current, patch);
  return saveTenantAIConfig(tenantId, next);
}

export async function getUserExperiencePreferences(
  tenantId: string,
  userId: string,
  isAdmin = false
) {
  const config = await getTenantAIConfig(tenantId);
  return config.userPreferences[userId] || buildDefaultUserPreferences(isAdmin ? 'advanced' : 'simple');
}

export async function updateUserExperiencePreferences(
  tenantId: string,
  userId: string,
  patch: Partial<AIUserExperiencePreferences>,
  isAdmin = false
) {
  const config = await getTenantAIConfig(tenantId);
  const current = config.userPreferences[userId] || buildDefaultUserPreferences(isAdmin ? 'advanced' : 'simple');
  const next: AIUserExperiencePreferences = {
    ...current,
    ...patch,
    onboardingChecklist: {
      ...current.onboardingChecklist,
      ...(patch.onboardingChecklist || {}),
    },
  };

  await saveTenantAIConfig(tenantId, {
    ...config,
    userPreferences: {
      ...config.userPreferences,
      [userId]: next,
    },
  });

  return next;
}

function nextCollectionItem<T extends { id: string }>(
  items: T[],
  incoming: Omit<T, 'id'> & { id?: string | null }
) {
  const id = stringValue(incoming.id) || crypto.randomUUID();
  const nextItem = {
    ...incoming,
    id,
  } as T;

  const exists = items.some((item) => item.id === id);
  return exists
    ? items.map((item) => (item.id === id ? nextItem : item))
    : [nextItem, ...items];
}

function actionableApprovalStatus(status: ApprovalStatus) {
  return status === 'PENDING' || status === 'ESCALATED';
}

function getWorkflowVersionNumber(record: any) {
  return numericValue(record?.triggerConfig?.version) || 1;
}

function workflowArchived(record: any) {
  return Boolean(record?.triggerConfig?.archived || record?.triggerConfig?.archivedAt);
}

function buildWorkflowGraph(steps: WorkflowDefinition['steps']) {
  const nodes = [
    {
      id: 'trigger',
      type: 'triggerNode',
      position: { x: 120, y: 120 },
      data: {},
    },
    ...steps.map((step, index) => ({
      id: step.id,
      type:
        step.kind === 'condition'
          ? 'conditionNode'
          : step.kind === 'delay'
            ? 'delayNode'
            : 'actionNode',
      position: { x: 420, y: 120 + index * 160 },
      data: {
        label: String(step.config.label || step.kind),
        stepKind: step.kind,
        config: step.config,
        actionType:
          step.kind === 'action'
            ? String((step.config as Record<string, unknown>).actionType || 'module_action')
            : step.kind === 'notification'
              ? 'send_email'
              : step.kind,
      },
    })),
  ];

  const edges = steps.map((step, index) => ({
    id: `edge-${index + 1}`,
    source: index === 0 ? 'trigger' : steps[index - 1].id,
    target: step.id,
  }));

  return { nodes, edges };
}

function buildApprovalNotification(
  recipient: string,
  type: 'created' | 'assignment' | 'escalated' | 'reminder' | 'resolved',
  summary: string,
  channel = 'in-app'
) {
  return {
    id: `note-${crypto.randomUUID()}`,
    type,
    sentAt: new Date().toISOString(),
    recipient,
    channel,
    summary,
  };
}

function averageAttemptCount(items: WorkflowQueueItem[]) {
  if (items.length === 0) {
    return '0.0';
  }

  const totalAttempts = items.reduce((sum, item) => sum + item.attemptCount, 0);
  return (totalAttempts / items.length).toFixed(1);
}

async function createAIInsight(args: {
  tenantId: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'INFO';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  return attempt(
    async () =>
      db.aIInsight.create({
        data: {
          tenantId: args.tenantId,
          type: args.type,
          category: 'control-plane',
          severity: args.severity,
          title: args.title,
          message: args.message,
          metadata: args.metadata || {},
          isRead: false,
          isActioned: false,
        },
      }),
    null
  );
}

function matchesWorkflowFilters(
  filters: Record<string, unknown>,
  payload: Record<string, unknown>
) {
  return Object.entries(filters).every(([key, expected]) => payload[key] === expected);
}

function getPolicyForCategory(
  config: TenantAIConfig,
  category: PolicyCategory,
  policyProfileId?: string | null
) {
  if (policyProfileId) {
    return config.policyProfiles.find((profile) => profile.id === policyProfileId) || null;
  }

  return config.policyProfiles.find((profile) => profile.category === category && profile.active) || null;
}

function buildApprovalRouting(
  config: TenantAIConfig,
  category: PolicyCategory,
  policyProfileId?: string | null
) {
  const policy = getPolicyForCategory(config, category, policyProfileId);
  const assignmentChain =
    (policy?.approverRoles && policy.approverRoles.length > 0
      ? [...policy.approverRoles, ...(policy.escalationRoles || [])]
      : config.settings.defaultApproverChain
    ).filter(Boolean);

  return {
    policy,
    assignmentChain,
    dueAt: new Date(
      Date.now() + 1000 * 60 * (policy?.approvalSlaMinutes || config.settings.escalationSlaMinutes || 240)
    ).toISOString(),
  };
}

function nextWorkflowVersion(
  config: TenantAIConfig,
  workflowId: string
) {
  return (
    config.workflowVersions
      .filter((version) => version.workflowId === workflowId)
      .reduce((max, version) => Math.max(max, version.version), 0) + 1
  );
}

function buildWorkflowSnapshot(record: any): WorkflowVersionRecord['snapshot'] {
  const definition = toWorkflowDefinition(record);
  const triggerConfig = objectValue(record.triggerConfig) || {};

  return {
    ...definition,
    description: stringValue(record.description),
    approvalsMode:
      (stringValue(triggerConfig.approvalsMode) as 'always' | 'policy' | 'never' | null) || 'policy',
    moduleScope:
      stringValue(triggerConfig.moduleScope) ||
      stringValue(triggerConfig.moduleId) ||
      'studio',
    archived: workflowArchived(record),
  };
}

async function recordWorkflowVersion(
  tenantId: string,
  workflow: any,
  actorId: string,
  reason: string
) {
  const config = await getTenantAIConfig(tenantId);
  const version = nextWorkflowVersion(config, workflow.id);
  const versionRecord: WorkflowVersionRecord = {
    id: `wfver-${crypto.randomUUID()}`,
    workflowId: workflow.id,
    tenantId,
    version,
    createdAt: new Date().toISOString(),
    createdBy: actorId,
    reason,
    snapshot: {
      ...buildWorkflowSnapshot(workflow),
      version,
    },
  };

  await saveTenantAIConfig(tenantId, {
    ...config,
    workflowVersions: [versionRecord, ...config.workflowVersions],
  });

  return versionRecord;
}

function getRetryDelayMs(config: TenantAIConfig, attemptCount: number) {
  const baseMinutes = Math.max(config.settings.retryBackoffMinutes || 10, 1);
  return baseMinutes * Math.pow(2, Math.max(attemptCount - 1, 0)) * 60 * 1000;
}

export async function logControlPlaneEvent(input: {
  tenantId: string;
  integration: string;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  errorMessage?: string;
}) {
  return attempt(
    async () =>
      db.integrationLog.create({
        data: {
          tenantId: input.tenantId,
          integration: input.integration,
          action: input.action,
          status: input.status,
          requestData: input.requestData || {},
          responseData: input.responseData || {},
          errorMessage: input.errorMessage,
        },
      }),
    null
  );
}

export async function publishDomainEvent(event: DomainEvent) {
  await logControlPlaneEvent({
    tenantId: event.tenantId,
    integration: 'ai-event-bus',
    action: `${event.module}.${event.entity}.${event.event}`,
    status: 'SUCCESS',
    requestData: event as unknown as Record<string, unknown>,
  });

  const triggerVariants = [
    `${event.module}.${event.entity}.${event.event}`,
    `${event.entity}.${event.event}`,
    event.event,
  ];

  const workflows = await attempt(
    async () =>
      db.studioWorkflow.findMany({
        where: {
          tenantId: event.tenantId,
          isActive: true,
        },
        select: {
          id: true,
          triggerType: true,
          triggerConfig: true,
        },
      }),
    []
  );

  for (const workflow of workflows) {
    const triggerConfig = objectValue(workflow.triggerConfig) || {};
    const triggerEvent = stringValue(triggerConfig.event) || workflow.triggerType;
    const moduleScope =
      stringValue(triggerConfig.moduleScope) || stringValue(triggerConfig.moduleId) || null;
    const filters = objectValue(triggerConfig.filters) || {};

    const moduleMatches =
      !moduleScope ||
      moduleScope === '*' ||
      moduleScope === event.module ||
      moduleScope === event.module.replace('-', '_');
    const eventMatches = triggerVariants.includes(triggerEvent);

    if (!moduleMatches || !eventMatches || !matchesWorkflowFilters(filters, event.payload)) {
      continue;
    }

    await enqueueWorkflowExecution({
      tenantId: event.tenantId,
      workflowId: workflow.id,
      requestedBy: event.actorId,
      source: 'event',
      idempotencyKey: `${workflow.id}:${event.id}`,
      triggerData: {
        ...event.payload,
        event: {
          id: event.id,
          module: event.module,
          entity: event.entity,
          name: event.event,
          occurredAt: event.occurredAt,
          correlationId: event.correlationId,
        },
      },
    });
  }

  return event;
}

export async function listDomainEvents(tenantId: string, limit = 25): Promise<EventRecord[]> {
  const rows = await attempt(
    async () =>
      db.integrationLog.findMany({
        where: {
          tenantId,
          integration: 'ai-event-bus',
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    []
  );

  return rows.map((row: any) => {
    const payload = (row.requestData || {}) as DomainEvent;
    return {
      id: row.id,
      module: payload.module || 'studio',
      event: `${payload.entity}.${payload.event}`,
      entity: payload.entity || 'event',
      occurredAt: iso(payload.occurredAt || row.createdAt) || new Date().toISOString(),
      status: row.status === 'FAILED' ? 'ignored' : row.status === 'PENDING' ? 'queued' : 'processed',
      correlationId: payload.correlationId || `corr-${row.id}`,
    };
  });
}

export function evaluatePolicyDecision(input: {
  category: PolicyCategory;
  amount?: number;
  batchSize?: number;
  riskHint?: number;
}) {
  let riskScore = input.riskHint ?? 10;
  const reasons: string[] = [];

  if (input.category === 'financial') {
    riskScore = Math.max(riskScore, input.amount && input.amount > 10000 ? 82 : 48);
    reasons.push('financial_control');
  }

  if (input.category === 'customer_comms') {
    riskScore = Math.max(riskScore, input.batchSize && input.batchSize > 100 ? 63 : 25);
    reasons.push('customer_exposure');
  }

  if (input.category === 'inventory') {
    riskScore = Math.max(riskScore, input.amount && input.amount > 5000 ? 58 : 20);
    reasons.push('inventory_impact');
  }

  if (input.category === 'regulatory') {
    riskScore = Math.max(riskScore, 90);
    reasons.push('regulatory_guardrail');
  }

  if (input.category === 'data_export') {
    riskScore = Math.max(riskScore, input.batchSize && input.batchSize > 50 ? 74 : 35);
    reasons.push('data_boundary');
  }

  const requiresApproval = riskScore >= 55 || input.category === 'regulatory';
  return {
    allow: true,
    requiresApproval,
    riskScore,
    reasonCodes: reasons,
  } satisfies PolicyDecision;
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numericValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayValue<T = unknown>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function requireFields(
  input: Record<string, unknown>,
  fields: Array<{ key: string; label?: string }>
) {
  const errors: string[] = [];

  for (const field of fields) {
    const value = input[field.key];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim().length === 0) ||
      (Array.isArray(value) && value.length === 0);

    if (missing) {
      errors.push(`${field.label || field.key} is required.`);
    }
  }

  return errors;
}

async function resolveAccountId(
  tenantId: string,
  line: Record<string, unknown>
) {
  const accountId = stringValue(line.accountId);
  if (accountId) {
    const account = await db.account.findFirst({
      where: { id: accountId, tenantId },
      select: { id: true },
    });
    return account?.id || null;
  }

  const accountCode = stringValue(line.accountCode);
  if (!accountCode) {
    return null;
  }

  const account = await db.account.findFirst({
    where: { code: accountCode, tenantId },
    select: { id: true },
  });

  return account?.id || null;
}

async function resolveAccountingPeriod(
  tenantId: string,
  entryDate: Date,
  requestedPeriodId?: string | null
) {
  if (requestedPeriodId) {
    return db.accountingPeriod.findFirst({
      where: { id: requestedPeriodId, tenantId, status: 'OPEN' },
      select: { id: true },
    });
  }

  return (
    (await db.accountingPeriod.findFirst({
      where: {
        tenantId,
        status: 'OPEN',
        startDate: { lte: entryDate },
        endDate: { gte: entryDate },
      },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    })) ||
    (await db.accountingPeriod.findFirst({
      where: { tenantId, status: 'OPEN' },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: { id: true },
    }))
  );
}

async function createAccountingJournalEntry(
  kind: 'write_off' | 'adjustment',
  input: Record<string, unknown>,
  ctx: AdapterExecutionContext
) {
  const entryDate = stringValue(input.entryDate) ? new Date(String(input.entryDate)) : new Date();
  const period = await resolveAccountingPeriod(
    ctx.tenantId,
    entryDate,
    stringValue(input.periodId)
  );

  if (!period) {
    throw new Error('No open accounting period found for this tenant.');
  }

  const rawLines = arrayValue<Record<string, unknown>>(input.lines);
  if (rawLines.length === 0) {
    throw new Error('At least one journal line is required.');
  }

  let totalDebit = 0;
  let totalCredit = 0;
  const lines = [];

  for (const rawLine of rawLines) {
    const accountId = await resolveAccountId(ctx.tenantId, rawLine);
    if (!accountId) {
      throw new Error('Each journal line must reference a valid accountId or accountCode.');
    }

    const debit = numericValue(rawLine.debit) || 0;
    const credit = numericValue(rawLine.credit) || 0;
    totalDebit += debit;
    totalCredit += credit;

    lines.push({
      accountId,
      description: stringValue(rawLine.description),
      debit,
      credit,
      currencyCode: stringValue(rawLine.currencyCode) || 'LKR',
      exchangeRate: numericValue(rawLine.exchangeRate) || 1,
      baseCurrency: numericValue(rawLine.baseCurrency) || 0,
      costCenterId: stringValue(rawLine.costCenterId),
      projectId: stringValue(rawLine.projectId),
    });
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error('Journal entry is not balanced.');
  }

  const journalEntry = await db.journalEntry.create({
    data: {
      tenantId: ctx.tenantId,
      periodId: period.id,
      reference:
        stringValue(input.reference) ||
        `${kind === 'write_off' ? 'AI-WO' : 'AI-ADJ'}-${Date.now()}`,
      description:
        stringValue(input.description) ||
        (kind === 'write_off' ? 'AI write-off adjustment' : 'AI financial adjustment'),
      entryDate,
      status: 'POSTED',
      postedBy: ctx.userId,
      sourceModule: 'ai',
      sourceDocumentId: stringValue(input.invoiceId),
      sourceDocumentType: kind === 'write_off' ? 'AI_WRITE_OFF' : 'AI_ADJUSTMENT',
      lines: {
        create: lines,
      },
    },
    include: {
      lines: true,
    },
  });

  return {
    journalEntryId: journalEntry.id,
    reference: journalEntry.reference,
    lineCount: journalEntry.lines.length,
  };
}

async function appendRestaurantMemo(
  tenantId: string,
  text: string,
  metadata: Record<string, unknown>
) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  const settings = ((tenant?.settings as Record<string, unknown> | null) || {}) as Record<string, unknown>;
  const existingMemo = arrayValue<Record<string, unknown>>(settings.restaurantDailyMemo);
  const nextMemo = {
    id: `memo-${Date.now()}`,
    text,
    createdAt: new Date().toISOString(),
    ...metadata,
  };

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...settings,
        restaurantDailyMemo: [nextMemo, ...existingMemo].slice(0, 50),
      },
    },
  });

  return nextMemo;
}

function createActionAdapter(definition: {
  module: DomainModule;
  action: string;
  category: PolicyCategory;
  description: string;
  validate?: (input: Record<string, unknown>) => Promise<{ valid: boolean; errors: string[] }>;
  execute: (
    input: Record<string, unknown>,
    ctx: AdapterExecutionContext
  ) => Promise<Record<string, unknown>>;
}): ActionAdapter {
  return {
    module: definition.module,
    action: definition.action,
    category: definition.category,
    description: definition.description,
    async validate(input) {
      if (definition.validate) {
        return definition.validate(input);
      }
      const errors = !input || Object.keys(input).length === 0 ? ['Input payload is required.'] : [];
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      const output = await definition.execute(input, ctx);
      return { ok: true, output };
    },
  };
}

async function performAdapterExecution(
  adapter: ActionAdapter,
  input: Record<string, unknown>,
  ctx: AdapterExecutionContext
) {
  try {
    const execution = await adapter.execute(input, ctx);
    await logControlPlaneEvent({
      tenantId: ctx.tenantId,
      integration: 'ai-action-adapter',
      action: `${adapter.module}.${adapter.action}`,
      status: 'SUCCESS',
      requestData: {
        module: adapter.module,
        action: adapter.action,
        correlationId: ctx.correlationId,
        input,
      },
      responseData: execution.output,
    });

    return execution;
  } catch (error: any) {
    await logControlPlaneEvent({
      tenantId: ctx.tenantId,
      integration: 'ai-action-adapter',
      action: `${adapter.module}.${adapter.action}`,
      status: 'FAILED',
      requestData: {
        module: adapter.module,
        action: adapter.action,
        correlationId: ctx.correlationId,
        input,
      },
      errorMessage: error?.message || 'Adapter execution failed',
    });
    throw error;
  }
}

const ACTION_ADAPTERS: ActionAdapter[] = [
  createActionAdapter({
    module: 'crm',
    action: 'follow_up_task',
    category: 'customer_comms',
    description: 'Create a CRM follow-up task for a lead, opportunity, or account.',
    async validate(input) {
      const errors = requireFields(input, [{ key: 'title' }]);
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      const task = await createCrmTask(
        ctx.tenantId,
        ctx.userId === 'workflow-engine' ? undefined : ctx.userId,
        {
          title: stringValue(input.title),
          description: stringValue(input.description),
          leadId: stringValue(input.leadId),
          opportunityId: stringValue(input.opportunityId),
          accountId: stringValue(input.accountId),
          priority: stringValue(input.priority) || 'MEDIUM',
          dueAt: stringValue(input.dueAt),
          assignedToUserId: stringValue(input.assignedToUserId) || null,
          metadata: objectValue(input.metadata),
        }
      );

      return {
        taskId: task.id,
        status: task.status,
        dueAt: iso(task.dueAt),
      };
    },
  }),
  createActionAdapter({
    module: 'crm',
    action: 'email_draft',
    category: 'customer_comms',
    description: 'Create a CRM email-draft activity with the proposed outreach content.',
    async validate(input) {
      const errors = requireFields(input, [{ key: 'subject' }]);
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      const activity = await createActivity(
        ctx.tenantId,
        ctx.userId === 'workflow-engine' ? undefined : ctx.userId,
        {
          activityType: 'EMAIL_DRAFT',
          subject: stringValue(input.subject),
          description: stringValue(input.body) || stringValue(input.description),
          leadId: stringValue(input.leadId),
          opportunityId: stringValue(input.opportunityId),
          accountId: stringValue(input.accountId),
          dueAt: stringValue(input.dueAt),
          metadata: {
            recipientEmail: stringValue(input.recipientEmail),
            cc: arrayValue<string>(input.cc),
            bcc: arrayValue<string>(input.bcc),
            ...objectValue(input.metadata),
          },
        }
      );

      return {
        activityId: activity.id,
        status: activity.status,
      };
    },
  }),
  createActionAdapter({
    module: 'accounting',
    action: 'write_off',
    category: 'financial',
    description: 'Post a tenant-scoped write-off journal entry using the supplied lines.',
    async validate(input) {
      const errors = requireFields(input, [{ key: 'lines' }]);
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      return createAccountingJournalEntry('write_off', input, ctx);
    },
  }),
  createActionAdapter({
    module: 'accounting',
    action: 'adjustment',
    category: 'financial',
    description: 'Post a tenant-scoped financial adjustment journal entry.',
    async validate(input) {
      const errors = requireFields(input, [{ key: 'lines' }]);
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      return createAccountingJournalEntry('adjustment', input, ctx);
    },
  }),
  createActionAdapter({
    module: 'spareparts',
    action: 'reorder_proposal',
    category: 'inventory',
    description: 'Create a spare-parts purchase order proposal using real supplier and product records.',
    async validate(input) {
      const errors = requireFields(input, [{ key: 'supplierId' }, { key: 'items' }]);
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      const items = arrayValue<Record<string, unknown>>(input.items).map((item) => ({
        productId: String(item.productId),
        quantity: numericValue(item.quantity) || 0,
        unitCost: numericValue(item.unitCost) || 0,
      }));

      const purchaseOrder = await createPurchaseOrder({
        tenantId: ctx.tenantId,
        createdById: ctx.userId,
        supplierId: String(input.supplierId),
        expectedDate: stringValue(input.expectedDate) ? new Date(String(input.expectedDate)) : undefined,
        notes: stringValue(input.notes) || undefined,
        isTaxEnabled: Boolean(input.isTaxEnabled),
        items,
      });

      return {
        purchaseOrderId: purchaseOrder.id,
        orderNumber: purchaseOrder.orderNumber,
        status: purchaseOrder.status,
      };
    },
  }),
  createActionAdapter({
    module: 'real-estate',
    action: 'schedule_viewing',
    category: 'customer_comms',
    description: 'Schedule a property viewing against a real property record.',
    async validate(input) {
      const errors = requireFields(input, [
        { key: 'propertyId' },
        { key: 'clientName' },
        { key: 'clientEmail' },
        { key: 'scheduledAt' },
      ]);
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      const property = await db.property.findFirst({
        where: { id: String(input.propertyId), tenantId: ctx.tenantId },
        select: { id: true },
      });

      if (!property) {
        throw new Error('Property not found for this tenant.');
      }

      const viewing = await db.propertyViewing.create({
        data: {
          propertyId: property.id,
          clientName: String(input.clientName),
          clientEmail: String(input.clientEmail),
          clientPhone: stringValue(input.clientPhone),
          scheduledAt: new Date(String(input.scheduledAt)),
          notes: stringValue(input.notes),
          status: stringValue(input.status) || 'SCHEDULED',
        },
      });

      return {
        viewingId: viewing.id,
        status: viewing.status,
      };
    },
  }),
  createActionAdapter({
    module: 'restaurant',
    action: 'shift_nudge',
    category: 'inventory',
    description: 'Persist an operational memo into restaurant settings for the team shift.',
    async validate(input) {
      const errors = requireFields(input, [{ key: 'text' }]);
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      const memo = await appendRestaurantMemo(ctx.tenantId, String(input.text), {
        audience: stringValue(input.audience) || 'staff',
        createdBy: ctx.userId,
      });

      return {
        memoId: String(memo.id),
      };
    },
  }),
  createActionAdapter({
    module: 'vehicle-export',
    action: 'dispatch_update',
    category: 'regulatory',
    description: 'Update shipment or vehicle dispatch state using real export records.',
    async validate(input) {
      const hasShipmentStatus = Boolean(stringValue(input.shipmentId) && stringValue(input.shipmentStatus));
      const hasVehicleStatus = Boolean(stringValue(input.vehicleId) && stringValue(input.vehicleStatus));
      const hasAssignment =
        Boolean(stringValue(input.shipmentId)) && arrayValue<string>(input.vehicleIds).length > 0;
      const errors = hasShipmentStatus || hasVehicleStatus || hasAssignment
        ? []
        : ['Provide shipment status, vehicle status, or a shipment vehicle assignment payload.'];
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      const shipmentId = stringValue(input.shipmentId);
      const shipmentStatus = stringValue(input.shipmentStatus);
      const vehicleId = stringValue(input.vehicleId);
      const vehicleStatus = stringValue(input.vehicleStatus);
      const vehicleIds = arrayValue<string>(input.vehicleIds).map(String);

      if (shipmentId && vehicleIds.length > 0) {
        const shipment = await assignVehiclesToShipment(shipmentId, vehicleIds, ctx.tenantId);
        return {
          shipmentId: shipment?.id || shipmentId,
          assignedVehicles: shipment?.vehicles?.length || vehicleIds.length,
          status: shipment?.status || 'BOOKED',
        };
      }

      if (shipmentId && shipmentStatus) {
        const shipment = await db.exportShipment.findFirst({
          where: { id: shipmentId, tenantId: ctx.tenantId },
          select: { id: true },
        });

        if (!shipment) {
          throw new Error('Shipment not found for this tenant.');
        }

        const updatedShipment = await db.exportShipment.update({
          where: { id: shipmentId },
          data: { status: shipmentStatus },
        });

        if (shipmentStatus === 'SAILED') {
          await db.exportVehicle.updateMany({
            where: { shipmentId, tenantId: ctx.tenantId },
            data: { status: 'SHIPPED' },
          });
        }

        if (shipmentStatus === 'ARRIVED') {
          await db.exportVehicle.updateMany({
            where: { shipmentId, tenantId: ctx.tenantId },
            data: { status: 'DELIVERED' },
          });
        }

        return {
          shipmentId: updatedShipment.id,
          status: updatedShipment.status,
        };
      }

      if (vehicleId && vehicleStatus) {
        const vehicle = await updateVehicle(vehicleId, ctx.tenantId, {
          status: vehicleStatus as any,
        });

        return {
          vehicleId: vehicle.id,
          status: vehicle.status,
        };
      }

      throw new Error('Dispatch update payload is incomplete.');
    },
  }),
  createActionAdapter({
    module: 'studio',
    action: 'create_record',
    category: 'data_export',
    description: 'Create a custom-module record inside the Studio runtime.',
    async validate(input) {
      const errors = requireFields(input, [{ key: 'moduleId' }, { key: 'data' }]);
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      const record = await createCustomRecord(
        String(input.moduleId),
        ctx.tenantId,
        objectValue(input.data) || {},
        ctx.userId
      );

      return {
        recordId: record.id,
        moduleId: String(input.moduleId),
      };
    },
  }),
  createActionAdapter({
    module: 'hr',
    action: 'add_employee',
    category: 'regulatory',
    description: 'Add a new employee to the HR system with full profile data.',
    async validate(input) {
      const errors = requireFields(input, [
        { key: 'firstName' },
        { key: 'lastName' },
        { key: 'email' },
        { key: 'position' },
        { key: 'employeeId' },
      ]);
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      const employee = await createEmployee({
        tenantId: ctx.tenantId,
        firstName: String(input.firstName),
        lastName: String(input.lastName),
        email: String(input.email),
        position: String(input.position),
        employeeNumber: String(input.employeeId),
        phone: stringValue(input.phone),
        salary: numericValue(input.salary),
        departmentId: stringValue(input.departmentId),
      } as any);

      return {
        id: employee.id,
        employeeId: employee.employeeId,
        status: employee.isActive ? 'ACTIVE' : 'INACTIVE',
      };
    },
  }),
  createActionAdapter({
    module: 'hr',
    action: 'leave_request',
    category: 'regulatory',
    description: 'Log a leave request for an employee on behalf of HR/Management.',
    async validate(input) {
      const errors = requireFields(input, [
        { key: 'employeeId' },
        { key: 'leaveType' },
        { key: 'startDate' },
        { key: 'endDate' },
        { key: 'days' },
      ]);
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      const leave = await db.leaveRequest.create({
        data: {
          tenantId: ctx.tenantId,
          employeeId: String(input.employeeId),
          leaveType: String(input.leaveType),
          startDate: new Date(String(input.startDate)),
          endDate: new Date(String(input.endDate)),
          days: numericValue(input.days) || 0,
          reason: stringValue(input.reason),
          status: 'PENDING',
        },
      });

      return {
        requestId: leave.id,
        status: leave.status,
      };
    },
  }),
  createActionAdapter({
    module: 'projects',
    action: 'create_task',
    category: 'inventory',
    description: 'Create a new project task with priority and due date.',
    async validate(input) {
      const errors = requireFields(input, [
        { key: 'projectId' },
        { key: 'title' },
      ]);
      return { valid: errors.length === 0, errors };
    },
    async execute(input, ctx) {
      const task = await createProjectTask({
        tenantId: ctx.tenantId,
        projectId: String(input.projectId),
        title: String(input.title),
        description: stringValue(input.description) ?? undefined,
        priority: (stringValue(input.priority) as any) || 'MEDIUM',
        status: (stringValue(input.status) as any) || 'TODO',
        dueDate: stringValue(input.dueDate) ? new Date(String(input.dueDate)) : undefined,
        assigneeId: stringValue(input.assigneeId) ?? undefined,
      });

      return {
        taskId: task.id,
        title: task.title,
        status: task.status,
      };
    },
  }),
];

export function getActionAdapters(module?: DomainModule) {
  return module ? ACTION_ADAPTERS.filter((adapter) => adapter.module === module) : ACTION_ADAPTERS;
}

export function getActionAdapter(module: DomainModule, action: string) {
  return ACTION_ADAPTERS.find((adapter) => adapter.module === module && adapter.action === action) || null;
}

export async function executeAdapterAction(args: {
  tenantId: string;
  userId: string;
  module: DomainModule;
  action: string;
  input: Record<string, unknown>;
}) {
  const adapter = getActionAdapter(args.module, args.action);

  if (!adapter) {
    return {
      ok: false,
      error: 'Adapter not found.',
    };
  }

  const validation = await adapter.validate(args.input);
  if (!validation.valid) {
    return {
      ok: false,
      error: validation.errors.join(' '),
    };
  }

  const decision = evaluatePolicyDecision({
    category: adapter.category,
    amount: typeof args.input.amount === 'number' ? (args.input.amount as number) : undefined,
    batchSize: typeof args.input.batchSize === 'number' ? (args.input.batchSize as number) : undefined,
    riskHint: typeof args.input.riskScore === 'number' ? (args.input.riskScore as number) : undefined,
  });

  const correlationId = `corr-${crypto.randomUUID()}`;
  if (decision.requiresApproval) {
    const config = await getTenantAIConfig(args.tenantId);
    const routing = buildApprovalRouting(config, adapter.category, config.settings.defaultPolicyProfileId);
    const assignedRole = routing.assignmentChain[0];
    const pendingItem: ApprovalItem = {
      id: `approval-${crypto.randomUUID()}`,
      tenantId: args.tenantId,
      module: args.module,
      title: `${args.module} ${args.action} requires approval`,
      summary: adapter.description,
      requestedBy: args.userId,
      riskScore: decision.riskScore,
      actionCategory: adapter.category,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      dueAt: routing.dueAt,
      correlationId,
      payload: args.input,
      assignedRole,
      assignmentChain: routing.assignmentChain,
      escalationLevel: 0,
      notifications: [
        buildApprovalNotification(
          assignedRole || 'approver',
          'created',
          `${args.module}.${args.action} was queued for approval`
        ),
      ],
      escalationHistory: [],
      executionRequest: {
        module: args.module,
        action: args.action,
        input: args.input,
        requestedByUserId: args.userId,
      },
    };

    await saveTenantAIConfig(args.tenantId, {
      ...config,
      pendingApprovals: [pendingItem, ...config.pendingApprovals],
    });

    await createAIInsight({
      tenantId: args.tenantId,
      type: 'APPROVAL_REQUIRED',
      severity: decision.riskScore >= 80 ? 'HIGH' : 'MEDIUM',
      title: pendingItem.title,
      message: pendingItem.summary,
      metadata: {
        approvalId: pendingItem.id,
        assignedRole: assignedRole ?? undefined,
        correlationId,
      },
    });

    await logControlPlaneEvent({
      tenantId: args.tenantId,
      integration: 'ai-approval',
      action: `${args.module}.${args.action}`,
      status: 'PENDING',
      requestData: {
        correlationId,
        decision,
        payload: args.input,
      },
    });

    return {
      ok: true,
      approvalRequired: true,
      decision,
      approvalItem: pendingItem,
    };
  }

  let execution;
  try {
    execution = await performAdapterExecution(adapter, args.input, {
      tenantId: args.tenantId,
      userId: args.userId,
      correlationId,
    });
  } catch (error: any) {
    return {
      ok: false,
      approvalRequired: false,
      decision,
      error: error?.message || 'Adapter execution failed.',
    };
  }

  return {
    ok: execution.ok,
    approvalRequired: false,
    decision,
    output: execution.output,
  };
}

export async function listApprovalQueue(tenantId: string) {
  const config = await getTenantAIConfig(tenantId);
  return config.pendingApprovals
    .filter((item) => actionableApprovalStatus(item.status))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export async function assignApprovalItem(args: {
  tenantId: string;
  approvalId: string;
  actorId: string;
  assignedRole?: string | null;
  assignedToUserId?: string | null;
  note?: string;
}) {
  const config = await getTenantAIConfig(args.tenantId);
  const current = config.pendingApprovals.find((item) => item.id === args.approvalId) || null;

  if (!current) {
    return null;
  }

  const assignedRole = stringValue(args.assignedRole) || current.assignedRole || current.assignmentChain[0] || undefined;
  const updated: ApprovalItem = {
    ...current,
    assignedRole: assignedRole,
    assignedToUserId: stringValue(args.assignedToUserId) || undefined,
    notifications: [
      buildApprovalNotification(
        assignedRole || args.assignedToUserId || 'approver',
        'assignment',
        args.note || `Approval ${current.id} was assigned`
      ),
      ...current.notifications,
    ],
  };

  await saveTenantAIConfig(args.tenantId, {
    ...config,
    pendingApprovals: config.pendingApprovals.map((item) => (item.id === args.approvalId ? updated : item)),
  });

  return updated;
}

export async function processApprovalEscalations(tenantId: string) {
  const config = await getTenantAIConfig(tenantId);
  const now = Date.now();
  let escalatedCount = 0;
  const nextApprovals = [...config.pendingApprovals];

  for (let index = 0; index < nextApprovals.length; index += 1) {
    const item = nextApprovals[index];
    if (!actionableApprovalStatus(item.status) || new Date(item.dueAt).getTime() > now) {
      continue;
    }

    const nextRole = item.assignmentChain[item.escalationLevel + 1];
    if (!nextRole) {
      continue;
    }

    escalatedCount += 1;
    const escalation = {
      id: `esc-${crypto.randomUUID()}`,
      level: item.escalationLevel + 1,
      fromRole: item.assignedRole,
      toRole: nextRole,
      escalatedAt: new Date().toISOString(),
      reason: 'Approval SLA breached',
      escalatedBy: 'system',
    };

    nextApprovals[index] = {
      ...item,
      status: 'ESCALATED',
      assignedRole: nextRole,
      escalationLevel: item.escalationLevel + 1,
      dueAt: new Date(
        Date.now() + config.settings.escalationSlaMinutes * 60 * 1000
      ).toISOString(),
      escalationHistory: [escalation, ...item.escalationHistory],
      notifications: [
        buildApprovalNotification(
          nextRole,
          'escalated',
          `${item.title} escalated to ${nextRole}`
        ),
        ...item.notifications,
      ],
    };

    await createAIInsight({
      tenantId,
      type: 'APPROVAL_ESCALATED',
      severity: 'HIGH',
      title: `Approval escalated for ${item.module}`,
      message: `${item.title} moved to ${nextRole} after missing SLA.`,
      metadata: {
        approvalId: item.id,
        previousRole: item.assignedRole,
        nextRole,
      },
    });
  }

  if (escalatedCount > 0) {
    await saveTenantAIConfig(tenantId, {
      ...config,
      pendingApprovals: nextApprovals,
    });
  }

  return escalatedCount;
}

export async function takeApprovalAction(args: {
  tenantId: string;
  approvalId: string;
  decision: Exclude<ApprovalStatus, 'PENDING'>;
  actorId: string;
  note?: string;
}) {
  const config = await getTenantAIConfig(args.tenantId);
  const current = config.pendingApprovals.find((item) => item.id === args.approvalId) || null;

  if (!current) {
    return null;
  }

  const actedAt = new Date().toISOString();
  let updated: ApprovalItem = {
    ...current,
    status: args.decision,
  };

  if (args.decision === 'ESCALATED') {
    const nextRole =
      current.assignmentChain[current.escalationLevel + 1] ||
      current.assignmentChain[current.escalationLevel] ||
      current.assignedRole;

    updated = {
      ...updated,
      assignedRole: nextRole,
      escalationLevel:
        nextRole && nextRole !== current.assignedRole
          ? current.escalationLevel + 1
          : current.escalationLevel,
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
      escalationHistory: [
        {
          id: `esc-${crypto.randomUUID()}`,
          level:
            nextRole && nextRole !== current.assignedRole
              ? current.escalationLevel + 1
              : current.escalationLevel,
          fromRole: current.assignedRole,
          toRole: nextRole || current.assignedRole || 'approver',
          escalatedAt: actedAt,
          reason: args.note || 'Escalated by operator',
          escalatedBy: args.actorId,
        },
        ...current.escalationHistory,
      ],
      notifications: [
        buildApprovalNotification(
          nextRole || current.assignedRole || 'approver',
          'escalated',
          args.note || `${current.title} was escalated`
        ),
        ...current.notifications,
      ],
      executionResult: {
        status: 'PENDING',
        actedAt,
        actedBy: args.actorId,
        note: args.note,
      },
    };
  }

  if (args.decision === 'APPROVED' && current.executionRequest) {
    const adapter = getActionAdapter(current.executionRequest.module, current.executionRequest.action);

    if (!adapter) {
      updated = {
        ...updated,
        executionResult: {
          status: 'FAILED',
          actedAt,
          actedBy: args.actorId,
          note: args.note,
          error: 'Adapter not found for approved request.',
        },
        notifications: [
          buildApprovalNotification(
            current.requestedBy,
            'resolved',
            `Approval failed because ${current.executionRequest.action} adapter was unavailable`
          ),
          ...current.notifications,
        ],
      };
    } else {
      try {
        const execution = await performAdapterExecution(adapter, current.executionRequest.input, {
          tenantId: args.tenantId,
          userId: current.executionRequest.requestedByUserId,
          correlationId: current.correlationId,
        });

        updated = {
          ...updated,
          executionResult: {
            status: 'SUCCESS',
            actedAt,
            actedBy: args.actorId,
            note: args.note,
            output: execution.output,
          },
          notifications: [
            buildApprovalNotification(
              current.requestedBy,
              'resolved',
              `${current.title} was approved and executed successfully`
            ),
            ...current.notifications,
          ],
        };
      } catch (error: any) {
        updated = {
          ...updated,
          executionResult: {
            status: 'FAILED',
            actedAt,
            actedBy: args.actorId,
            note: args.note,
            error: error?.message || 'Approved action execution failed.',
          },
          notifications: [
            buildApprovalNotification(
              current.requestedBy,
              'resolved',
              `${current.title} failed after approval`
            ),
            ...current.notifications,
          ],
        };
      }
    }
  } else if (args.decision !== 'APPROVED' && args.decision !== 'ESCALATED') {
    updated = {
      ...updated,
      executionResult: {
        status: 'PENDING',
        actedAt,
        actedBy: args.actorId,
        note: args.note,
      },
      notifications: [
        buildApprovalNotification(
          current.requestedBy,
          'resolved',
          args.note || `${current.title} marked ${args.decision.toLowerCase()}`
        ),
        ...current.notifications,
      ],
    };
  }

  const nextApprovals = config.pendingApprovals.map((item) =>
    item.id === args.approvalId ? updated : item
  );

  await saveTenantAIConfig(args.tenantId, {
    ...config,
    pendingApprovals: nextApprovals,
  });

  await logControlPlaneEvent({
    tenantId: args.tenantId,
    integration: 'ai-approval',
    action: `${updated.module}.approval.${args.decision.toLowerCase()}`,
    status: updated.executionResult?.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
    requestData: {
      approvalId: args.approvalId,
      actorId: args.actorId,
      note: args.note,
    },
    responseData: {
      updatedStatus: args.decision,
      correlationId: updated.correlationId,
      executionResult: updated.executionResult,
    },
  });

  return updated;
}

export async function listPolicyProfiles(tenantId: string) {
  const config = await getTenantAIConfig(tenantId);
  return config.policyProfiles;
}

export async function upsertPolicyProfile(
  tenantId: string,
  input: Omit<import('@/lib/ai/control-plane-types').PolicyProfile, 'id'> & { id?: string | null }
) {
  const config = await getTenantAIConfig(tenantId);
  const policyProfiles = nextCollectionItem(config.policyProfiles, {
    ...input,
    approverRoles: arrayValue<string>(input.approverRoles),
    escalationRoles: arrayValue<string>(input.escalationRoles),
    approvalSlaMinutes: numericValue(input.approvalSlaMinutes) || config.settings.escalationSlaMinutes,
  });

  const nextSettings = {
    ...config.settings,
    defaultPolicyProfileId:
      !config.settings.defaultPolicyProfileId || config.settings.defaultPolicyProfileId === input.id
        ? policyProfiles.find((profile) => profile.active)?.id || policyProfiles[0]?.id || ''
        : config.settings.defaultPolicyProfileId,
  };

  await saveTenantAIConfig(tenantId, {
    ...config,
    settings: nextSettings,
    policyProfiles,
  });

  return policyProfiles;
}

export async function deletePolicyProfile(tenantId: string, policyId: string) {
  const config = await getTenantAIConfig(tenantId);
  const policyProfiles = config.policyProfiles.filter((policy) => policy.id !== policyId);
  const defaultPolicyProfileId =
    config.settings.defaultPolicyProfileId === policyId
      ? policyProfiles.find((policy) => policy.active)?.id || policyProfiles[0]?.id || ''
      : config.settings.defaultPolicyProfileId;

  await saveTenantAIConfig(tenantId, {
    ...config,
    settings: {
      ...config.settings,
      defaultPolicyProfileId,
    },
    policyProfiles,
  });

  return policyProfiles;
}

export async function listCopilotConfigs(tenantId: string) {
  const config = await getTenantAIConfig(tenantId);
  return config.copilots;
}

export async function upsertCopilotConfig(
  tenantId: string,
  input: Omit<import('@/lib/ai/control-plane-types').CopilotConfig, 'id'> & { id?: string | null }
) {
  const config = await getTenantAIConfig(tenantId);
  const copilots = nextCollectionItem(config.copilots, {
    ...input,
    allowedIntents: arrayValue<string>(input.allowedIntents),
    dataSources: arrayValue<string>(input.dataSources),
    actionPermissions: arrayValue<string>(input.actionPermissions),
  });
  await saveTenantAIConfig(tenantId, {
    ...config,
    copilots,
  });
  return copilots;
}

export async function deleteCopilotConfig(tenantId: string, copilotId: string) {
  const config = await getTenantAIConfig(tenantId);
  const copilots = config.copilots.filter((copilot) => copilot.id !== copilotId);
  await saveTenantAIConfig(tenantId, {
    ...config,
    copilots,
  });
  return copilots;
}

export async function listIntegrationConfigs(tenantId: string) {
  const config = await getTenantAIConfig(tenantId);
  return config.integrations;
}

export async function upsertIntegrationConfig(
  tenantId: string,
  input: Omit<import('@/lib/ai/control-plane-types').IntegrationConfig, 'id'> & { id?: string | null }
) {
  const config = await getTenantAIConfig(tenantId);
  const integrations = nextCollectionItem(config.integrations, {
    ...input,
    lastCheckedAt: stringValue(input.lastCheckedAt) || null,
  });
  await saveTenantAIConfig(tenantId, {
    ...config,
    integrations,
  });
  return integrations;
}

export async function deleteIntegrationConfig(tenantId: string, integrationId: string) {
  const config = await getTenantAIConfig(tenantId);
  const integrations = config.integrations.filter((integration) => integration.id !== integrationId);
  await saveTenantAIConfig(tenantId, {
    ...config,
    integrations,
  });
  return integrations;
}

export async function listWorkflowTemplates(tenantId: string): Promise<WorkflowTemplateRecord[]> {
  const config = await getTenantAIConfig(tenantId);
  return config.workflowTemplates;
}

export async function upsertWorkflowTemplate(
  tenantId: string,
  input: Omit<WorkflowTemplateRecord, 'id'> & { id?: string | null }
) {
  const config = await getTenantAIConfig(tenantId);
  const workflowTemplates = nextCollectionItem(config.workflowTemplates, input);
  await saveTenantAIConfig(tenantId, {
    ...config,
    workflowTemplates,
  });
  return workflowTemplates;
}

export async function deleteWorkflowTemplate(tenantId: string, templateId: string) {
  const config = await getTenantAIConfig(tenantId);
  const workflowTemplates = config.workflowTemplates.filter((template) => template.id !== templateId);
  await saveTenantAIConfig(tenantId, {
    ...config,
    workflowTemplates,
  });
  return workflowTemplates;
}

export async function getAISettings(tenantId: string) {
  const config = await getTenantAIConfig(tenantId);
  return config.settings;
}

export async function upsertAISettings(
  tenantId: string,
  nextSettings: Partial<AIControlPlaneSettings>
) {
  const config = await getTenantAIConfig(tenantId);
  const updated = await saveTenantAIConfig(tenantId, {
    ...config,
    settings: {
      ...config.settings,
      ...nextSettings,
      defaultApproverChain:
        nextSettings.defaultApproverChain || config.settings.defaultApproverChain,
    },
  });
  return updated.settings;
}

export async function restoreDefaultAISettings(tenantId: string) {
  const config = await getTenantAIConfig(tenantId);
  const defaultPolicyProfileId =
    config.policyProfiles.find((policy) => policy.active)?.id || config.policyProfiles[0]?.id || '';

  const updated = await saveTenantAIConfig(tenantId, {
    ...config,
    settings: {
      ...buildDefaultSettings(),
      defaultPolicyProfileId,
    },
  });
  return updated.settings;
}

export async function createTestAIAlert(tenantId: string, actorId: string) {
  const insight = await db.aIInsight.create({
    data: {
      tenantId,
      type: 'TEST_ALERT',
      category: 'control-plane',
      severity: 'INFO',
      title: 'Test AI control-plane alert',
      message: `Generated by ${actorId} to validate operator notification wiring.`,
      metadata: {
        actorId,
        generatedAt: new Date().toISOString(),
      },
      isRead: false,
      isActioned: false,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  await logControlPlaneEvent({
    tenantId,
    integration: 'ai-settings',
    action: 'send_test_alert',
    status: 'SUCCESS',
    requestData: {
      actorId,
    },
    responseData: {
      insightId: insight.id,
    },
  });

  return insight;
}

export async function listWorkflowRegistry(tenantId: string): Promise<RegistryItem[]> {
  const [config, studioWorkflows, legacyRules, workflowRunCounts] = await Promise.all([
    getTenantAIConfig(tenantId),
    attempt(
      async () =>
        db.studioWorkflow.findMany({
          where: { tenantId },
          orderBy: { updatedAt: 'desc' },
        }),
      []
    ),
    attempt(
      async () =>
        db.automationRule.findMany({
          where: { tenantId },
          orderBy: { updatedAt: 'desc' },
        }),
      []
    ),
    attempt(
      async () =>
        db.workflowExecution.groupBy({
          by: ['workflowId'],
          where: {
            workflow: { is: { tenantId } },
          },
          _count: { _all: true },
        }),
      []
    ),
  ]);

  const runCountByWorkflowId = new Map<string, number>(
    workflowRunCounts.map((row: any) => [row.workflowId, row._count?._all || 0])
  );
  const latestVersionByWorkflowId = new Map<string, number>();

  for (const version of config.workflowVersions) {
    latestVersionByWorkflowId.set(
      version.workflowId,
      Math.max(latestVersionByWorkflowId.get(version.workflowId) || 0, version.version)
    );
  }

  const workflowItems: RegistryItem[] = studioWorkflows.map((workflow: any) => ({
    id: workflow.id,
    source: 'studio-workflow',
    name: workflow.name,
    description: workflow.description || 'Studio workflow',
    module: workflow.triggerConfig?.moduleScope || workflow.triggerConfig?.moduleId || 'studio',
    trigger: workflow.triggerConfig?.event || workflow.triggerType,
    owner: workflow.createdById || 'system',
    status: workflowArchived(workflow) ? 'archived' : workflow.isActive ? 'active' : 'paused',
    runCount: runCountByWorkflowId.get(workflow.id) || 0,
    updatedAt: iso(workflow.updatedAt) || new Date().toISOString(),
    policyProfileId: workflow.triggerConfig?.policyProfileId || '',
    version: latestVersionByWorkflowId.get(workflow.id) || getWorkflowVersionNumber(workflow),
  }));

  const ruleItems: RegistryItem[] = legacyRules.map((rule: any) => ({
    id: rule.id,
    source: 'legacy-rule',
    name: rule.name,
    description: rule.description || 'Legacy automation rule',
    module: rule.triggerConfig?.module || 'studio',
    trigger: rule.triggerConfig?.event || rule.triggerType,
    owner: rule.createdById || 'system',
    status: rule.isActive ? 'active' : 'paused',
    runCount: rule.runCount || 0,
    updatedAt: iso(rule.updatedAt) || new Date().toISOString(),
    policyProfileId: rule.triggerConfig?.policyProfileId || '',
    version: 1,
  }));

  return [...workflowItems, ...ruleItems].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createWorkflowDefinition(
  tenantId: string,
  createdById: string,
  input: WorkflowCreateInput
) {
  const steps: WorkflowDefinition['steps'] = input.steps && input.steps.length > 0
    ? input.steps
    : [
        {
          id: 'step-1',
          kind: 'notification',
          config: {
            label: 'Notify operator',
            channel: 'in-app',
          },
        },
      ];

  const graph = buildWorkflowGraph(steps);
  graph.nodes[0].data = {
    label: input.triggerEvent,
    moduleScope: input.moduleScope,
    filters: input.filters || {},
  };

  const workflow = await db.studioWorkflow.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      triggerType: input.triggerEvent,
      triggerConfig: {
        event: input.triggerEvent,
        filters: input.filters || {},
        moduleScope: input.moduleScope,
        policyProfileId: input.policyProfileId,
        approvalsMode: input.approvalsMode,
        version: 1,
        archived: false,
      },
      nodes: graph.nodes,
      edges: graph.edges,
      isActive: input.isActive ?? true,
      createdById,
    },
  });

  await recordWorkflowVersion(tenantId, workflow, createdById, 'created');

  await publishDomainEvent({
    id: `evt-workflow-${workflow.id}`,
    tenantId,
    module: 'studio',
    entity: 'workflow',
    event: 'created',
    occurredAt: new Date().toISOString(),
    actorType: 'user',
    actorId: createdById,
    correlationId: `corr-workflow-create-${workflow.id}`,
    payload: {
      workflowId: workflow.id,
      triggerEvent: input.triggerEvent,
      moduleScope: input.moduleScope,
    },
  });

  return workflow;
}

export async function setWorkflowEnabled(
  tenantId: string,
  workflowId: string,
  enabled: boolean,
  actorId: string
) {
  const workflow = await db.studioWorkflow.findFirst({
    where: { tenantId, id: workflowId },
  });

  if (!workflow) {
    return null;
  }

  const updated = await db.studioWorkflow.update({
    where: { id: workflowId },
    data: {
      isActive: enabled,
      triggerConfig: {
        ...(objectValue(workflow.triggerConfig) || {}),
        archived: false,
      },
    },
  });

  await recordWorkflowVersion(tenantId, updated, actorId, enabled ? 'resumed' : 'paused');

  await publishDomainEvent({
    id: `evt-workflow-${updated.id}-${enabled ? 'resumed' : 'paused'}`,
    tenantId,
    module: 'studio',
    entity: 'workflow',
    event: enabled ? 'resumed' : 'paused',
    occurredAt: new Date().toISOString(),
    actorType: 'user',
    actorId,
    correlationId: `corr-workflow-status-${updated.id}-${Date.now()}`,
    payload: {
      workflowId: updated.id,
      enabled,
    },
  });

  return updated;
}

export async function cloneWorkflowDefinition(
  tenantId: string,
  workflowId: string,
  actorId: string
) {
  const workflow = await db.studioWorkflow.findFirst({
    where: { tenantId, id: workflowId },
  });

  if (!workflow) {
    return null;
  }

  const clone = await db.studioWorkflow.create({
    data: {
      tenantId,
      name: `${workflow.name} Copy`,
      description: workflow.description,
      triggerType: workflow.triggerType,
      triggerConfig: {
        ...(objectValue(workflow.triggerConfig) || {}),
        version: 1,
        archived: false,
      },
      nodes: workflow.nodes,
      edges: workflow.edges,
      isActive: false,
      createdById: actorId,
    },
  });

  await recordWorkflowVersion(tenantId, clone, actorId, 'cloned');

  await publishDomainEvent({
    id: `evt-workflow-${clone.id}-cloned`,
    tenantId,
    module: 'studio',
    entity: 'workflow',
    event: 'cloned',
    occurredAt: new Date().toISOString(),
    actorType: 'user',
    actorId,
    correlationId: `corr-workflow-clone-${clone.id}`,
    payload: {
      workflowId: clone.id,
      sourceWorkflowId: workflow.id,
    },
  });

  return clone;
}

export async function archiveWorkflowDefinition(
  tenantId: string,
  workflowId: string,
  actorId: string
) {
  const workflow = await db.studioWorkflow.findFirst({
    where: { tenantId, id: workflowId },
  });

  if (!workflow) {
    return null;
  }

  const updated = await db.studioWorkflow.update({
    where: { id: workflowId },
    data: {
      isActive: false,
      triggerConfig: {
        ...(objectValue(workflow.triggerConfig) || {}),
        archived: true,
        archivedAt: new Date().toISOString(),
      },
    },
  });

  await recordWorkflowVersion(tenantId, updated, actorId, 'archived');

  await publishDomainEvent({
    id: `evt-workflow-${updated.id}-archived`,
    tenantId,
    module: 'studio',
    entity: 'workflow',
    event: 'archived',
    occurredAt: new Date().toISOString(),
    actorType: 'user',
    actorId,
    correlationId: `corr-workflow-archive-${updated.id}`,
    payload: {
      workflowId: updated.id,
    },
  });

  return updated;
}

export async function listWorkflowVersions(tenantId: string, workflowId: string) {
  const config = await getTenantAIConfig(tenantId);
  return config.workflowVersions
    .filter((version) => version.workflowId === workflowId)
    .sort((left, right) => right.version - left.version);
}

export async function rollbackWorkflowDefinition(
  tenantId: string,
  workflowId: string,
  versionId: string,
  actorId: string
) {
  const config = await getTenantAIConfig(tenantId);
  const versionRecord = config.workflowVersions.find(
    (version) => version.id === versionId && version.workflowId === workflowId
  );

  if (!versionRecord) {
    return null;
  }

  const graph = buildWorkflowGraph(versionRecord.snapshot.steps);
  graph.nodes[0].data = {
    label: versionRecord.snapshot.trigger.event,
    moduleScope: versionRecord.snapshot.moduleScope || 'studio',
    filters: versionRecord.snapshot.trigger.filters || {},
  };

  const updated = await db.studioWorkflow.updateMany({
    where: { id: workflowId, tenantId },
    data: {
      name: versionRecord.snapshot.name,
      description: versionRecord.snapshot.description || null,
      triggerType: versionRecord.snapshot.trigger.event,
      triggerConfig: {
        event: versionRecord.snapshot.trigger.event,
        filters: versionRecord.snapshot.trigger.filters || {},
        moduleScope: versionRecord.snapshot.moduleScope || 'studio',
        policyProfileId: versionRecord.snapshot.policyProfileId,
        approvalsMode: versionRecord.snapshot.approvalsMode || 'policy',
        version: versionRecord.snapshot.version + 1,
        archived: false,
      },
      nodes: graph.nodes,
      edges: graph.edges,
      isActive: versionRecord.snapshot.enabled,
    },
  });

  if (!updated.count) {
    return null;
  }

  const workflow = await db.studioWorkflow.findFirst({
    where: { id: workflowId, tenantId },
  });

  if (!workflow) {
    return null;
  }

  await recordWorkflowVersion(
    tenantId,
    workflow,
    actorId,
    `rolled_back_to_v${versionRecord.version}`
  );

  return workflow;
}

export async function simulateWorkflowDefinition(
  tenantId: string,
  workflowId: string,
  triggerData: Record<string, unknown>
): Promise<WorkflowSimulationResult | null> {
  const detail = await getWorkflowDetail(tenantId, workflowId);

  if (!detail) {
    return null;
  }

  const definition = toWorkflowDefinition(detail.workflow);
  const steps: WorkflowSimulationResult['steps'] = [];

  for (const step of definition.steps) {
    if (step.kind === 'condition') {
      const field = stringValue(step.config.field);
      const exists = field
        ? field.split('.').reduce((obj: any, key: string) => obj?.[key], { trigger: triggerData }) !== undefined
        : false;
      steps.push({
        id: step.id,
        kind: step.kind,
        status: exists ? 'pass' : 'warn',
        message: exists
          ? `Condition field ${field} resolved from trigger data.`
          : 'Condition field is missing from the simulation payload.',
      });
      continue;
    }

    if (step.kind === 'action') {
      const config = objectValue(step.config) || {};
      const actionType = stringValue(config.actionType) || 'module_action';
      if (actionType !== 'module_action') {
        steps.push({
          id: step.id,
          kind: step.kind,
          status: 'pass',
          message: `Action ${actionType} can run with current configuration.`,
        });
        continue;
      }

      const adapter = getActionAdapter(
        (stringValue(config.module) || stringValue(config.moduleId) || 'studio') as DomainModule,
        stringValue(config.action) || stringValue(config.actionId) || 'create_record'
      );

      if (!adapter) {
        steps.push({
          id: step.id,
          kind: step.kind,
          status: 'fail',
          message: 'No adapter exists for this module action.',
        });
        continue;
      }

      const payload = objectValue(config.payload) || objectValue(config.data) || {};
      const validation = await adapter.validate(payload);
      steps.push({
        id: step.id,
        kind: step.kind,
        status: validation.valid ? 'pass' : 'warn',
        message: validation.valid
          ? `${adapter.module}.${adapter.action} validated for simulation.`
          : validation.errors.join(' '),
      });
      continue;
    }

    if (step.kind === 'delay') {
      steps.push({
        id: step.id,
        kind: step.kind,
        status: 'warn',
        message: 'Delay steps will be delegated to the durable execution queue.',
      });
      continue;
    }

    steps.push({
      id: step.id,
      kind: step.kind,
      status: 'pass',
      message: `${step.kind} step is structurally valid.`,
    });
  }

  const failures = steps.filter((step) => step.status === 'fail').length;
  return {
    workflowId,
    simulatedAt: new Date().toISOString(),
    success: failures === 0,
    summary:
      failures === 0
        ? 'Simulation passed without blocking issues.'
        : `${failures} blocking issue(s) found during simulation.`,
    steps,
  };
}

export async function listExecutionQueue(tenantId: string) {
  const config = await getTenantAIConfig(tenantId);
  return [...config.executionQueue].sort((left, right) =>
    left.scheduledFor.localeCompare(right.scheduledFor)
  );
}

export async function listDeadLetterQueue(tenantId: string) {
  const config = await getTenantAIConfig(tenantId);
  return [...config.deadLetterQueue].sort((left, right) =>
    (right.completedAt || right.scheduledFor).localeCompare(left.completedAt || left.scheduledFor)
  );
}

export async function enqueueWorkflowExecution(args: {
  tenantId: string;
  workflowId: string;
  triggerData: Record<string, unknown>;
  requestedBy: string;
  source?: WorkflowQueueItem['source'];
  scheduledFor?: string;
  idempotencyKey?: string | null;
}) {
  const config = await getTenantAIConfig(args.tenantId);
  const idempotencyKey =
    stringValue(args.idempotencyKey) ||
    `${args.workflowId}:${JSON.stringify(args.triggerData)}:${args.requestedBy}`;
  const existing =
    config.executionQueue.find((item) => item.idempotencyKey === idempotencyKey) ||
    config.deadLetterQueue.find((item) => item.idempotencyKey === idempotencyKey);

  if (existing) {
    return existing;
  }

  const item: WorkflowQueueItem = {
    id: `queue-${crypto.randomUUID()}`,
    workflowId: args.workflowId,
    tenantId: args.tenantId,
    correlationId: `queue-corr-${crypto.randomUUID()}`,
    idempotencyKey,
    status: 'queued',
    source: args.source || 'system',
    requestedBy: args.requestedBy,
    triggerData: args.triggerData,
    scheduledFor: args.scheduledFor || new Date().toISOString(),
    attemptCount: 0,
    maxAttempts: Math.max(config.settings.maxExecutionAttempts || 3, 1),
    failureHistory: [],
  };

  await saveTenantAIConfig(args.tenantId, {
    ...config,
    executionQueue: [item, ...config.executionQueue],
  });

  await logControlPlaneEvent({
    tenantId: args.tenantId,
    integration: 'ai-workflow-queue',
    action: 'workflow.enqueued',
    status: 'PENDING',
    requestData: {
      workflowId: args.workflowId,
      queueItemId: item.id,
      idempotencyKey,
    },
  });

  return item;
}

export async function processExecutionQueue(tenantId: string, limit = 5) {
  const config = await getTenantAIConfig(tenantId);
  const now = Date.now();
  let executionQueue = [...config.executionQueue];
  let deadLetterQueue = [...config.deadLetterQueue];
  const dueItems = executionQueue
    .filter(
      (item) =>
        (item.status === 'queued' || item.status === 'retrying') &&
        new Date(item.scheduledFor).getTime() <= now
    )
    .sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor))
    .slice(0, limit);

  if (dueItems.length === 0) {
    return { processed: 0, deadLetters: 0 };
  }

  for (const dueItem of dueItems) {
    executionQueue = executionQueue.map((item) =>
      item.id === dueItem.id
        ? {
            ...item,
            status: 'processing',
            startedAt: new Date().toISOString(),
            attemptCount: item.attemptCount + 1,
          }
        : item
    );
    await saveTenantAIConfig(tenantId, {
      ...config,
      executionQueue,
      deadLetterQueue,
    });

    try {
      const { WorkflowEngine } = await import('@/apps/studio/workflow-engine');
      const result = await WorkflowEngine.executeWorkflow(
        dueItem.workflowId,
        tenantId,
        dueItem.triggerData,
        { allowInactive: false }
      );

      if (!result?.ok) {
        throw new Error(result?.error || 'Workflow execution failed');
      }

      executionQueue = executionQueue.map((item) =>
        item.id === dueItem.id
          ? {
              ...item,
              status: 'completed',
              completedAt: new Date().toISOString(),
              executionId: result.executionId,
              lastError: undefined,
            }
          : item
      );

      await logControlPlaneEvent({
        tenantId,
        integration: 'ai-workflow-queue',
        action: 'workflow.completed',
        status: 'SUCCESS',
        requestData: {
          workflowId: dueItem.workflowId,
          queueItemId: dueItem.id,
        },
        responseData: {
          executionId: result.executionId,
        },
      });
    } catch (error: any) {
      const failedItem = executionQueue.find((item) => item.id === dueItem.id);
      if (!failedItem) {
        continue;
      }

      const failure = {
        attempt: failedItem.attemptCount,
        at: new Date().toISOString(),
        error: error?.message || 'Workflow execution failed',
      };

      if (failedItem.attemptCount >= failedItem.maxAttempts) {
        const deadLetterItem: WorkflowQueueItem = {
          ...failedItem,
          status: 'dead_letter',
          completedAt: new Date().toISOString(),
          lastError: failure.error,
          failureHistory: [failure, ...failedItem.failureHistory],
        };

        deadLetterQueue = [deadLetterItem, ...deadLetterQueue];
        executionQueue = executionQueue.filter((item) => item.id !== dueItem.id);

        await createAIInsight({
          tenantId,
          type: 'WORKFLOW_DEAD_LETTER',
          severity: 'HIGH',
          title: 'Workflow execution moved to dead-letter queue',
          message: failure.error,
          metadata: {
            workflowId: dueItem.workflowId,
            queueItemId: dueItem.id,
          },
        });

        await logControlPlaneEvent({
          tenantId,
          integration: 'ai-workflow-queue',
          action: 'workflow.dead_letter',
          status: 'FAILED',
          requestData: {
            workflowId: dueItem.workflowId,
            queueItemId: dueItem.id,
          },
          errorMessage: failure.error,
        });
      } else {
        executionQueue = executionQueue.map((item) =>
          item.id === dueItem.id
            ? {
                ...item,
                status: 'retrying',
                scheduledFor: new Date(
                  Date.now() + getRetryDelayMs(config, failedItem.attemptCount)
                ).toISOString(),
                lastError: failure.error,
                failureHistory: [failure, ...failedItem.failureHistory],
              }
            : item
        );

        await logControlPlaneEvent({
          tenantId,
          integration: 'ai-workflow-queue',
          action: 'workflow.retry_scheduled',
          status: 'PENDING',
          requestData: {
            workflowId: dueItem.workflowId,
            queueItemId: dueItem.id,
            attemptCount: failedItem.attemptCount,
          },
          errorMessage: failure.error,
        });
      }
    }
  }

  await saveTenantAIConfig(tenantId, {
    ...config,
    executionQueue,
    deadLetterQueue,
  });

  return {
    processed: dueItems.length,
    deadLetters: deadLetterQueue.length,
  };
}

export async function processAllTenantAutomationQueues() {
  let cursor: string | undefined;
  let processed = 0;
  let escalations = 0;
  let tenantCount = 0;

  // Paginate tenants to avoid loading all into memory
  while (true) {
    const batch = await attempt(
      async () =>
        db.tenant.findMany({
          select: { id: true },
          take: 100,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: 'asc' },
        }),
      []
    );

    if (batch.length === 0) break;
    tenantCount += batch.length;
    cursor = batch[batch.length - 1].id;

    for (const tenant of batch) {
      const queueResult = await processExecutionQueue(tenant.id, 3);
      processed += queueResult.processed;
      escalations += await processApprovalEscalations(tenant.id);
    }
  }

  return { tenants: tenantCount, processed, escalations };
}

export async function getWorkflowDetail(tenantId: string, workflowId: string) {
  const workflow = await attempt(
    async () =>
      db.studioWorkflow.findFirst({
        where: { tenantId, id: workflowId },
      }),
    null
  );

  if (!workflow) {
    return null;
  }

  const executions = await attempt(
    async () =>
      db.workflowExecution.findMany({
        where: {
          workflowId,
          workflow: { is: { tenantId } },
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
    []
  );

  const versions = await listWorkflowVersions(tenantId, workflowId);
  const config = await getTenantAIConfig(tenantId);
  const queuedRuns = config.executionQueue.filter(
    (item) =>
      item.workflowId === workflowId &&
      ['queued', 'retrying', 'processing'].includes(item.status)
  );
  const deadLetters = config.deadLetterQueue.filter((item) => item.workflowId === workflowId);

  return {
    workflow,
    executions,
    versions,
    queuedRuns,
    deadLetters,
  };
}

export async function listAgents(tenantId: string): Promise<AgentRecord[]> {
  const [agents, models, executions] = await Promise.all([
    attempt(
      async () =>
        db.aIAgent.findMany({
          where: { tenantId },
          orderBy: { updatedAt: 'desc' },
        }),
      []
    ),
    attempt(
      async () =>
        db.languageModel.findMany({
          where: { tenantId, isActive: true },
          orderBy: { isDefault: 'desc' },
        }),
      []
    ),
    attempt(
      async () =>
        db.agentExecution.findMany({
          where: { tenantId },
          select: { agentId: true, status: true, startedAt: true },
          orderBy: { startedAt: 'desc' },
        }),
      []
    ),
  ]);

  const defaultModel = models.find((model: any) => model.isDefault) || models[0];
  const modelById = new Map<string, any>(models.map((model: any) => [model.id, model]));

  return agents.map((agent: any) => {
    const agentExecutions = executions.filter((execution: any) => execution.agentId === agent.id);
    const successCount = agentExecutions.filter((execution: any) => execution.status === 'SUCCESS').length;
    const totalExecutions = agentExecutions.length;
    const assignedModelId = stringValue(agent.config?.modelId);
    const assignedModel = (assignedModelId && modelById.get(assignedModelId)) || defaultModel;

    return {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      description: agent.description || 'AI agent',
      active: Boolean(agent.isActive),
      tasksCompleted: totalExecutions || agent.tasksCompleted || 0,
      successRate:
        totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : agent.successRate || 0,
      lastRunAt: iso(agentExecutions[0]?.startedAt || agent.lastRunAt),
      modelLabel: assignedModel ? `${assignedModel.provider}:${assignedModel.modelId}` : 'unassigned',
      allowedTools: (agent.config?.allowedTools as string[] | undefined) || [],
    };
  });
}

export async function createAgentRecord(tenantId: string, input: AgentCreateInput) {
  return db.aIAgent.create({
    data: {
      tenantId,
      name: input.name,
      type: input.type,
      description: input.description,
      isActive: input.isActive ?? true,
      config: {
        moduleScope: input.moduleScope,
        allowedTools: input.allowedTools || [],
        modelId: input.modelId || null,
        escalationPolicy: input.escalationPolicy || 'approval_gate',
      },
    },
  });
}

export async function getAgentDetail(tenantId: string, agentId: string) {
  const agent = await attempt(
    async () =>
      db.aIAgent.findFirst({
        where: { tenantId, id: agentId },
      }),
    null
  );

  if (!agent) {
    return null;
  }

  const executions = await attempt(
    async () =>
      db.agentExecution.findMany({
        where: { tenantId, agentId },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
    []
  );

  return {
    agent,
    executions,
  };
}

export async function listModels(tenantId: string): Promise<ModelRecord[]> {
  const [models, usage] = await Promise.all([
    attempt(
      async () =>
        db.languageModel.findMany({
          where: { tenantId },
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        }),
      []
    ),
    attempt(
      async () =>
        db.modelUsage.groupBy({
          by: ['modelId'],
          where: { tenantId },
          _sum: {
            totalTokens: true,
            cost: true,
          },
          _max: {
            createdAt: true,
          },
        }),
      []
    ),
  ]);

  const usageByModelId = new Map<string, any>(usage.map((row: any) => [row.modelId, row]));

  return models.map((model: any) => {
    const usageRow = usageByModelId.get(model.id);

    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      modelId: model.modelId,
      description: model.description || null,
      capabilities: Array.isArray(model.capabilities) ? model.capabilities : [],
      contextWindow: model.contextWindow || 4096,
      maxTokens: model.maxTokens ?? null,
      temperature: model.temperature ?? 0.7,
      apiEndpoint: model.apiEndpoint || null,
      isDefault: Boolean(model.isDefault),
      isActive: Boolean(model.isActive),
      lastUsedAt: iso(usageRow?._max?.createdAt || model.lastUsedAt),
      totalCost: Number(usageRow?._sum?.cost ?? model.totalCost ?? 0),
      totalTokens: Number(usageRow?._sum?.totalTokens ?? model.totalTokens ?? 0),
    };
  });
}

export async function recordModelUsage(args: {
  tenantId: string;
  modelId?: string | null;
  provider?: string | null;
  providerModelId?: string | null;
  conversationId?: string | null;
  userId?: string | null;
  operation: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  success?: boolean;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}) {
  let model = null;

  if (args.modelId) {
    model = await attempt(
      async () =>
        db.languageModel.findFirst({
          where: { id: args.modelId, tenantId: args.tenantId },
        }),
      null
    );
  }

  if (!model && args.provider && args.providerModelId) {
    model = await attempt(
      async () =>
        db.languageModel.findFirst({
          where: {
            tenantId: args.tenantId,
            provider: args.provider,
            modelId: args.providerModelId,
          },
        }),
      null
    );
  }

  if (!model) {
    return null;
  }

  const usage = await attempt(
    async () =>
      db.modelUsage.create({
        data: {
          tenantId: args.tenantId,
          modelId: model.id,
          conversationId: args.conversationId || null,
          userId: args.userId || null,
          operation: args.operation,
          promptTokens: args.promptTokens || 0,
          completionTokens: args.completionTokens || 0,
          totalTokens: args.totalTokens || 0,
          cost: args.cost || 0,
          success: args.success ?? true,
          errorMessage: args.errorMessage || null,
          metadata: args.metadata || {},
        },
      }),
    null
  );

  await attempt(
    async () =>
      db.languageModel.update({
        where: { id: model.id },
        data: {
          usageCount: { increment: 1 },
          totalTokens: { increment: BigInt(args.totalTokens || 0) },
          totalCost: { increment: args.cost || 0 },
          lastUsedAt: new Date(),
        },
      }),
    null
  );

  if (args.conversationId) {
    await attempt(
      async () =>
        db.conversationModel.create({
          data: {
            conversationId: args.conversationId,
            modelId: model.id,
            usedAt: new Date(),
            tokensUsed: args.totalTokens || 0,
            cost: args.cost || 0,
            tenantId: args.tenantId,
          },
        }),
      null
    );
  }

  return usage;
}

export async function createModelRecord(args: {
  tenantId: string;
  name: string;
  provider: string;
  modelId: string;
  description?: string | null;
  capabilities?: string[];
  contextWindow?: number;
  maxTokens?: number | null;
  temperature?: number;
  apiEndpoint?: string | null;
  apiKey?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}) {
  if (args.isDefault) {
    await attempt(
      async () =>
        db.languageModel.updateMany({
          where: { tenantId: args.tenantId, isDefault: true },
          data: { isDefault: false },
        }),
      null
    );
  }

  return db.languageModel.create({
    data: {
      tenantId: args.tenantId,
      name: args.name,
      provider: args.provider,
      modelId: args.modelId,
      description: args.description || null,
      capabilities: args.capabilities || [],
      contextWindow: args.contextWindow || 4096,
      maxTokens: args.maxTokens || null,
      temperature: args.temperature ?? 0.7,
      apiEndpoint: args.apiEndpoint || null,
      apiKey: args.apiKey || null,
      isDefault: args.isDefault ?? false,
      isActive: args.isActive ?? true,
    },
  });
}

export async function updateModelRecord(
  tenantId: string,
  modelId: string,
  args: {
    name: string;
    provider: string;
    modelIdValue: string;
    description?: string | null;
    capabilities?: string[];
    contextWindow?: number;
    maxTokens?: number | null;
    temperature?: number;
    apiEndpoint?: string | null;
    apiKey?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
  }
) {
  if (args.isDefault) {
    await attempt(
      async () =>
        db.languageModel.updateMany({
          where: { tenantId, isDefault: true, id: { not: modelId } },
          data: { isDefault: false },
        }),
      null
    );
  }

  return db.languageModel.updateMany({
    where: { id: modelId, tenantId },
    data: {
      name: args.name,
      provider: args.provider,
      modelId: args.modelIdValue,
      description: args.description || null,
      capabilities: args.capabilities || [],
      contextWindow: args.contextWindow || 4096,
      maxTokens: args.maxTokens || null,
      temperature: args.temperature ?? 0.7,
      apiEndpoint: args.apiEndpoint || null,
      ...(args.apiKey !== undefined ? { apiKey: args.apiKey || null } : {}),
      isDefault: args.isDefault,
      isActive: args.isActive,
    },
  });
}

export async function deleteModelRecord(tenantId: string, modelId: string) {
  return db.languageModel.deleteMany({
    where: { id: modelId, tenantId },
  });
}

export async function setDefaultModelRecord(tenantId: string, modelId: string) {
  await db.$transaction([
    db.languageModel.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    }),
    db.languageModel.updateMany({
      where: { id: modelId, tenantId },
      data: { isDefault: true },
    }),
  ]);

  return listModels(tenantId);
}

export async function listPrompts(tenantId: string): Promise<PromptRecord[]> {
  const prompts = await attempt(
    async () =>
      db.promptTemplate.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        }),
    []
  );

  return prompts.map((prompt: any) => ({
    id: prompt.id,
    name: prompt.name,
    description: prompt.description || null,
    category: prompt.category,
    template: prompt.template,
    modelId: prompt.modelId || null,
    isActive: Boolean(prompt.isActive),
    usageCount: prompt.usageCount || 0,
    variables: Array.isArray(prompt.variables) ? prompt.variables : [],
    updatedAt: iso(prompt.updatedAt) || new Date().toISOString(),
  }));
}

export async function createPromptRecord(args: {
  tenantId: string;
  name: string;
  description?: string | null;
  category: string;
  template: string;
  variables?: string[];
  modelId?: string | null;
  isActive?: boolean;
  createdBy?: string | null;
}) {
  return db.promptTemplate.create({
    data: {
      tenantId: args.tenantId,
      name: args.name,
      description: args.description || null,
      category: args.category,
      template: args.template,
      variables: args.variables || [],
      modelId: args.modelId || null,
      isActive: args.isActive ?? true,
      createdBy: args.createdBy || null,
    },
  });
}

export async function updatePromptRecord(
  tenantId: string,
  promptId: string,
  args: {
    name: string;
    description?: string | null;
    category: string;
    template: string;
    variables?: string[];
    modelId?: string | null;
    isActive?: boolean;
  }
) {
  return db.promptTemplate.updateMany({
    where: { id: promptId, tenantId },
    data: {
      name: args.name,
      description: args.description || null,
      category: args.category,
      template: args.template,
      variables: args.variables || [],
      modelId: args.modelId || null,
      isActive: args.isActive,
    },
  });
}

export async function deletePromptRecord(tenantId: string, promptId: string) {
  return db.promptTemplate.deleteMany({
    where: { id: promptId, tenantId },
  });
}

export async function listAuditTrail(tenantId: string): Promise<AuditRecord[]> {
  const rows = await attempt(
    async () =>
      db.integrationLog.findMany({
        where: {
          tenantId,
          integration: {
            in: ['ai-event-bus', 'ai-approval', 'ai-action-adapter'],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    []
  );

  return rows.map((row: any) => ({
    id: row.id,
    action: row.action,
    integration: row.integration,
    status: row.status,
    createdAt: iso(row.createdAt) || new Date().toISOString(),
    summary: row.errorMessage || `${row.integration} ${row.action}`,
    details: {
      requestData: row.requestData || {},
      responseData: row.responseData || {},
    },
  }));
}

export async function generateAuditEvidenceBundle(
  tenantId: string
): Promise<AuditEvidenceBundle> {
  const [config, recentEvents, recentAudit] = await Promise.all([
    getTenantAIConfig(tenantId),
    listDomainEvents(tenantId, 100),
    listAuditTrail(tenantId),
  ]);

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    settings: config.settings,
    policies: config.policyProfiles,
    approvals: config.pendingApprovals,
    queue: config.executionQueue,
    deadLetters: config.deadLetterQueue,
    workflowVersions: config.workflowVersions,
    recentEvents,
    recentAudit,
    counts: {
      approvals: config.pendingApprovals.length,
      queue: config.executionQueue.length,
      deadLetters: config.deadLetterQueue.length,
      workflowVersions: config.workflowVersions.length,
      recentEvents: recentEvents.length,
      recentAudit: recentAudit.length,
    },
  };
}

export async function getPredictiveInsights(tenantId: string): Promise<PredictiveInsight[]> {
  const [
    staleOpportunities,
    overdueInvoices,
    lowStockParts,
    propertyInquiries,
    openShifts,
    delayedShipments,
  ] = await Promise.all([
    attempt(
      async () =>
        db.crmOpportunity.findMany({
          where: {
            tenantId,
            status: 'OPEN',
            updatedAt: {
              lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
            },
          },
          select: { id: true, name: true, amount: true, probabilityPercent: true },
          take: 20,
        }),
      []
    ),
    attempt(
      async () =>
        db.invoice.findMany({
          where: {
            tenantId,
            status: { in: ['OPEN', 'OVERDUE'] },
            dueDate: { lt: new Date() },
          },
          select: { id: true, number: true, amountDue: true, dueDate: true },
          take: 20,
        }),
      []
    ),
    attempt(
      async () =>
        db.sparePart.findMany({
          where: {
            tenantId,
            isActive: true,
          },
          select: { id: true, name: true, stockQty: true, minStockQty: true },
          take: 50,
        }),
      []
    ),
    attempt(
      async () =>
        db.propertyInquiry.findMany({
          where: {
            property: { tenantId },
            status: 'NEW',
          },
          select: { id: true, propertyId: true, createdAt: true },
          take: 25,
        }),
      []
    ),
    attempt(
      async () =>
        db.restaurantShift.findMany({
          where: {
            tenantId,
            status: 'OPEN',
          },
          select: { id: true, startTime: true },
        }),
      []
    ),
    attempt(
      async () =>
        db.exportShipment.findMany({
          where: {
            tenantId,
            eta: { lt: new Date() },
            status: { not: 'ARRIVED' },
          },
          select: { id: true, shipmentNumber: true, eta: true, destinationPort: true },
          take: 20,
        }),
      []
    ),
  ]);

  const lowStockCount = lowStockParts.filter(
    (part: any) => Number(part.stockQty || 0) <= Number(part.minStockQty || 0)
  ).length;
  const overdueAmount = overdueInvoices.reduce(
    (sum: number, invoice: any) => sum + Number(invoice.amountDue || 0),
    0
  );

  const insights: PredictiveInsight[] = [
    {
      id: 'pred-crm-stale-opps',
      module: 'crm',
      type: 'deal_risk',
      title: 'Stale opportunity risk',
      summary: `${staleOpportunities.length} open opportunities have not been updated for 14+ days.`,
      score: Math.min(staleOpportunities.length * 8, 100),
      severity: staleOpportunities.length >= 5 ? 'high' : staleOpportunities.length > 0 ? 'medium' : 'low',
      recommendation: 'Route stale opportunities into a follow-up sequence and refresh close dates.',
      generatedAt: new Date().toISOString(),
      data: { count: staleOpportunities.length },
    },
    {
      id: 'pred-accounting-collections',
      module: 'accounting',
      type: 'collections_risk',
      title: 'Collections pressure',
      summary: `${overdueInvoices.length} invoices are overdue with ${overdueAmount.toFixed(2)} outstanding.`,
      score: Math.min(overdueInvoices.length * 10, 100),
      severity: overdueInvoices.length >= 5 ? 'high' : overdueInvoices.length > 0 ? 'medium' : 'low',
      recommendation: 'Trigger reminder workflows and prioritize manual outreach for the largest balances.',
      generatedAt: new Date().toISOString(),
      data: { overdueInvoices: overdueInvoices.length, overdueAmount },
    },
    {
      id: 'pred-spareparts-stock',
      module: 'spareparts',
      type: 'reorder_pressure',
      title: 'Reorder pressure',
      summary: `${lowStockCount} spare parts are at or below minimum stock.`,
      score: Math.min(lowStockCount * 7, 100),
      severity: lowStockCount >= 10 ? 'high' : lowStockCount > 0 ? 'medium' : 'low',
      recommendation: 'Generate supplier-specific reorder proposals before demand slips into stockout.',
      generatedAt: new Date().toISOString(),
      data: { lowStockCount },
    },
    {
      id: 'pred-real-estate-demand',
      module: 'real-estate',
      type: 'inquiry_backlog',
      title: 'Inquiry handling backlog',
      summary: `${propertyInquiries.length} new property inquiries are waiting for action.`,
      score: Math.min(propertyInquiries.length * 9, 100),
      severity: propertyInquiries.length >= 8 ? 'high' : propertyInquiries.length > 0 ? 'medium' : 'low',
      recommendation: 'Auto-schedule viewings or route hot inquiries to the next available agent.',
      generatedAt: new Date().toISOString(),
      data: { inquiryCount: propertyInquiries.length },
    },
    {
      id: 'pred-restaurant-staffing',
      module: 'restaurant',
      type: 'staffing_balance',
      title: 'Shift coverage watch',
      summary: `${openShifts.length} staff members are clocked in right now.`,
      score: openShifts.length < 3 ? 72 : 28,
      severity: openShifts.length < 3 ? 'medium' : 'low',
      recommendation: 'Use shift nudges before service peaks if open coverage falls below expected staffing.',
      generatedAt: new Date().toISOString(),
      data: { openShifts: openShifts.length },
    },
    {
      id: 'pred-vehicle-export-delay',
      module: 'vehicle-export',
      type: 'shipment_delay',
      title: 'Shipment delay exposure',
      summary: `${delayedShipments.length} shipments are past ETA and still not delivered.`,
      score: Math.min(delayedShipments.length * 12, 100),
      severity: delayedShipments.length >= 3 ? 'high' : delayedShipments.length > 0 ? 'medium' : 'low',
      recommendation: 'Escalate shipment updates, confirm customs state, and notify affected customers.',
      generatedAt: new Date().toISOString(),
      data: { delayedShipments: delayedShipments.length },
    },
  ];

  return insights;
}

function getRoleFocus(aiRoles: string[] = []) {
  if (aiRoles.includes('APPROVER') && !aiRoles.includes('AUTOMATION_DESIGNER')) {
    return {
      title: 'Your focus today',
      description: 'Review pending approvals and resolve any actions that are waiting for a decision.',
    };
  }

  if (aiRoles.includes('OPERATOR') && !aiRoles.includes('AI_ADMIN')) {
    return {
      title: 'Your focus today',
      description: 'Watch alerts, failed automations, and assistant readiness so work keeps moving.',
    };
  }

  return {
    title: 'Getting started',
    description: 'Finish setup, publish the first automation, and make the module usable for business teams.',
  };
}

export async function getCommandCenterData(
  tenantId: string,
  options?: { userId?: string; isAdmin?: boolean; aiRoles?: string[] }
): Promise<CommandCenterPayload> {
  const [
    workflows,
    approvals,
    insights,
    agents,
    models,
    failedWorkflowRuns,
    copilots,
    settings,
  ] = await Promise.all([
    listWorkflowRegistry(tenantId),
    listApprovalQueue(tenantId),
    attempt(
      async () =>
        db.aIInsight.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 6,
        }),
      []
    ),
    listAgents(tenantId),
    listModels(tenantId),
    attempt(
      async () =>
        db.workflowExecution.findMany({
          where: {
            workflow: { is: { tenantId } },
            status: 'failed',
          },
          include: {
            workflow: true,
          },
          orderBy: { startedAt: 'desc' },
          take: 5,
        }),
      []
    ),
    listCopilotConfigs(tenantId),
    getAISettings(tenantId),
  ]);
  const preferences = options?.userId
    ? await getUserExperiencePreferences(tenantId, options.userId, options?.isAdmin)
    : buildDefaultUserPreferences(options?.isAdmin ? 'advanced' : 'simple');

  const activeWorkflows = workflows.filter((item) => item.status === 'active').length;
  const failedRuns = failedWorkflowRuns.length;
  const activeAgents = agents.filter((agent: AgentRecord) => agent.active).length;
  const unreadInsights = insights.filter((insight: any) => insight.isRead === false).length;
  const monthlyModelCost = models.reduce((sum, model) => sum + Number(model.totalCost || 0), 0);

  const moduleHeatmap: CommandCenterPayload['moduleHeatmap'] = (
    ['crm', 'accounting', 'spareparts', 'real-estate', 'restaurant', 'vehicle-export'] as DomainModule[]
  ).map((module) => {
    const moduleWorkflowCount = workflows.filter(
      (workflow) => workflow.module === module || workflow.module === module.replace('-', '_')
    ).length;
    const backlog = approvals.filter((approval) => approval.module === module).length;
    const copilotEnabled = copilots.some((copilot) => copilot.module === module && copilot.enabled);
    const health =
      backlog > 2 ? 'critical' : moduleWorkflowCount === 0 ? 'attention' : 'healthy';

    return {
      module,
      automationCount: moduleWorkflowCount,
      copilotEnabled,
      approvalBacklog: backlog,
      health,
    };
  });

  return {
    summary: {
      activeWorkflows,
      pendingApprovals: approvals.length,
      failedRuns,
      activeAgents,
      unreadInsights,
      monthlyModelCost,
    },
    setupProgress: {
      completed: [
        models.some((model) => model.isActive),
        Boolean(settings.defaultPolicyProfileId),
        copilots.some((copilot) => copilot.enabled),
        activeWorkflows > 0,
        preferences.lastVisitedSection === 'tasks' || preferences.lastVisitedSection === 'inbox' || preferences.onboardingChecklist.reviewApprovalInbox,
      ].filter(Boolean).length,
      total: 5,
      items: {
        connectModel: models.some((model) => model.isActive),
        chooseDefaultPolicy: Boolean(settings.defaultPolicyProfileId),
        enableCopilot: copilots.some((copilot) => copilot.enabled),
        publishFirstAutomation: activeWorkflows > 0,
        reviewApprovalInbox:
          preferences.lastVisitedSection === 'tasks' ||
          preferences.lastVisitedSection === 'inbox' ||
          preferences.onboardingChecklist.reviewApprovalInbox,
        dismissed: preferences.onboardingChecklist.dismissed,
      },
    },
    roleFocus: getRoleFocus(options?.aiRoles || []),
    alerts: insights.map((insight: any) => ({
      id: insight.id,
      title: insight.title || insight.type,
      severity: insight.severity || 'MEDIUM',
      message: insight.message,
      createdAt: iso(insight.createdAt) || new Date().toISOString(),
    })),
    pendingApprovals: approvals.slice(0, 5),
    failedRuns: failedWorkflowRuns.map((run: any) => ({
      id: run.id,
      workflowName: run.workflow?.name || 'Workflow',
      status: run.status,
      startedAt: iso(run.startedAt) || new Date().toISOString(),
      error: run.error || 'Execution failed',
    })),
    moduleHeatmap,
    assistantReadiness: (
      ['crm', 'accounting', 'spareparts', 'real-estate', 'restaurant', 'vehicle-export'] as DomainModule[]
    ).map((module) => {
      const enabled = copilots.some((copilot) => copilot.module === module && copilot.enabled);
      const modelsReady = models.some((model) => model.isActive);
      return {
        module,
        label: `${getModuleLabel(module)} Assistant`,
        status: enabled && modelsReady ? 'ready' : enabled ? 'attention' : 'setup_needed',
        description: enabled
          ? modelsReady
            ? 'Ready for staff to use from the module page.'
            : 'Configured, but a model provider still needs attention.'
          : 'Enable a copilot profile for this business area.',
      };
    }),
  };
}

export async function getAnalyticsData(tenantId: string): Promise<AnalyticsPayload> {
  const [workflowRuns, agents, config, models, predictions] = await Promise.all([
    attempt(
      async () =>
        db.workflowExecution.findMany({
          where: { workflow: { is: { tenantId } } },
          orderBy: { startedAt: 'desc' },
        }),
      []
    ),
    listAgents(tenantId),
    getTenantAIConfig(tenantId),
    listModels(tenantId),
    getPredictiveInsights(tenantId),
  ]);

  const totalRuns = workflowRuns.length;
  const successRuns = workflowRuns.filter((run: any) => run.status === 'completed').length;
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0;
  const activeAgentCount = agents.filter((agent: AgentRecord) => agent.active).length;
  const totalCost = models.reduce((sum, model) => sum + model.totalCost, 0);
  const approvalHistory = config.pendingApprovals;
  const periodStarts = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (5 - index));
    return date;
  });

  return {
    kpis: [
      {
        label: 'Workflow Success Rate',
        value: `${successRate}%`,
        trend: totalRuns > 0 ? `${successRuns}/${totalRuns} completed` : 'No runs yet',
      },
      {
        label: 'Pending Approvals',
        value: String(approvalHistory.filter((item) => item.status === 'PENDING').length),
        trend:
          approvalHistory.filter((item) => item.status === 'PENDING').length > 0
            ? 'Requires approver attention'
            : 'Queue clear',
      },
      {
        label: 'Active Agents',
        value: String(activeAgentCount),
        trend: `${agents.length} total configured`,
      },
      {
        label: 'Model Spend',
        value: `$${totalCost.toFixed(2)}`,
        trend: 'Tenant-scoped cumulative cost',
      },
    ],
    throughput: periodStarts.map((periodStart) => {
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
      return {
        period: periodStart.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        runs: workflowRuns.filter((run: any) => {
          const startedAt = new Date(run.startedAt);
          return startedAt >= periodStart && startedAt < periodEnd;
        }).length,
        approvals: approvalHistory.filter((approval) => {
          const createdAt = new Date(approval.createdAt);
          return createdAt >= periodStart && createdAt < periodEnd;
        }).length,
      };
    }),
    predictions,
    queueHealth: {
      pending: config.executionQueue.filter((item) => item.status === 'queued').length,
      retrying: config.executionQueue.filter((item) => item.status === 'retrying').length,
      deadLetters: config.deadLetterQueue.length,
      averageAttempts: averageAttemptCount(config.executionQueue),
    },
  };
}

export async function runDiagnostics(tenantId: string) {
  const [workflows, models, config] = await Promise.all([
    listWorkflowRegistry(tenantId),
    listModels(tenantId),
    getTenantAIConfig(tenantId),
  ]);

  return [
    {
      label: 'Tenant AI Config',
      status: config.settings.defaultPolicyProfileId ? 'ok' : 'warn',
      detail: config.settings.defaultPolicyProfileId || 'No default policy profile configured',
    },
    {
      label: 'Workflow Registry',
      status: workflows.length > 0 ? 'ok' : 'warn',
      detail: `${workflows.length} workflow records found`,
    },
    {
      label: 'Model Routing',
      status: models.some((model) => model.isDefault) ? 'ok' : 'warn',
      detail: `${models.length} models registered`,
    },
    {
      label: 'Provider Keys',
      status: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY ? 'ok' : 'warn',
      detail: process.env.GROQ_API_KEY ? 'Groq configured' : 'Fallback to local inference',
    },
  ];
}

export async function getModulePurposeBrief() {
  return {
    title: 'ERP AI Control Plane',
    purpose:
      'Coordinate tenant-safe AI copilots, workflow execution, approvals, and audit across every business module.',
    responsibilities: [
      'Listen for business events and normalize them into automation-ready signals.',
      'Apply policy and approval controls before any high-impact action executes.',
      'Route AI requests to the most appropriate model provider for the tenant and use-case.',
      'Expose a single operator workspace for monitoring, approvals, and diagnostics.',
    ],
  };
}

export async function getModuleMatrix() {
  return [
    {
      module: 'crm',
      workflows: ['lead scoring', 'follow-up sequencing', 'discount approval'],
      copilots: ['account summary', 'outreach draft'],
    },
    {
      module: 'accounting',
      workflows: ['invoice reminder', 'collections escalation', 'close checklist'],
      copilots: ['variance summary', 'reconciliation suggestion'],
    },
    {
      module: 'spareparts',
      workflows: ['reorder proposal', 'aging stock alert', 'supplier escalation'],
      copilots: ['demand summary', 'supplier comparison'],
    },
    {
      module: 'real-estate',
      workflows: ['visit scheduling', 'contract milestone reminders', 'rent due alerts'],
      copilots: ['property brief', 'occupancy insight'],
    },
    {
      module: 'restaurant',
      workflows: ['prep priority alert', 'staffing nudge', 'wastage alert'],
      copilots: ['shift briefing', 'menu performance summary'],
    },
    {
      module: 'vehicle-export',
      workflows: ['shipment milestone tracking', 'document completeness checks', 'dispatch approvals'],
      copilots: ['shipment narrative', 'compliance summary'],
    },
  ];
}

export function toWorkflowDefinition(record: any): WorkflowDefinition {
  const triggerConfig = record.triggerConfig || {};
  const nodeList = Array.isArray(record.nodes) ? record.nodes : [];
  const stepNodes = nodeList.filter((node: any) => node.id !== 'trigger');

  return {
    id: record.id,
    tenantId: record.tenantId,
    name: record.name,
    version: numericValue(triggerConfig.version) || 1,
    trigger: {
      event: triggerConfig.event || record.triggerType,
      filters: triggerConfig.filters || {},
    },
    steps: stepNodes.map((node: any) => ({
      id: node.id,
      kind: node.data?.stepKind || 'action',
      config: node.data?.config || {},
    })),
    policyProfileId: triggerConfig.policyProfileId || '',
    enabled: Boolean(record.isActive),
  };
}

export function getLegacyRuleCompatSpec(rule: any) {
  return {
    id: rule.id,
    compiler: 'legacy-rule-to-workflow',
    targetTrigger: rule.triggerConfig?.event || String(rule.triggerType || 'manual'),
    notes: 'Legacy automation rules compile into the unified workflow runtime.',
  };
}

export async function getForecastSnapshot(tenantId: string, months = 6) {
  const [invoices, shopInvoices] = await Promise.all([
    attempt(
      async () =>
        db.invoice.findMany({
          where: {
            tenantId,
            status: { notIn: ['DRAFT', 'CANCELLED', 'VOIDED'] },
          },
          select: {
            issueDate: true,
            total: true,
          },
        }),
      []
    ),
    attempt(
      async () =>
        db.shopInvoice.findMany({
          where: {
            tenantId,
            status: { in: ['CONFIRMED', 'COMPLETED'] },
          },
          select: {
            createdAt: true,
            total: true,
          },
        }),
      []
    ),
  ]);

  const historyMap = new Map<string, number>();
  const addRevenue = (dateValue: Date, total: number) => {
    const key = dateValue.toISOString().slice(0, 7);
    historyMap.set(key, (historyMap.get(key) || 0) + total);
  };

  for (const invoice of invoices) {
    addRevenue(new Date(invoice.issueDate), Number(invoice.total || 0));
  }

  for (const invoice of shopInvoices) {
    addRevenue(new Date(invoice.createdAt), Number(invoice.total || 0));
  }

  const history = Array.from(historyMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, value]) => ({ period, value }));

  if (history.length === 0) {
    return {
      type: 'revenue_forecast',
      accuracy: null,
      lastUpdated: new Date().toISOString(),
      basis: 'insufficient_history',
      predictions: [],
      history: [],
    };
  }

  const trailingValues = history.slice(-3).map((row) => row.value);
  const projectedValue =
    trailingValues.reduce((sum, value) => sum + value, 0) / trailingValues.length;
  const start = new Date();

  return {
    type: 'revenue_forecast',
    accuracy: null,
    lastUpdated: new Date().toISOString(),
    basis: `moving_average_${trailingValues.length}_months`,
    predictions: Array.from({ length: months }).map((_, index) => ({
      period: new Date(start.getFullYear(), start.getMonth() + index + 1, 1).toISOString().slice(0, 7),
      value: Number(projectedValue.toFixed(2)),
      confidence: null,
      factors: {
        historyMonths: history.length,
        sourceDocuments: invoices.length + shopInvoices.length,
      },
    })),
    history,
  };
}
