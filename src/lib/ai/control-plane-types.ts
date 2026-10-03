export type DomainModule =
  | 'crm'
  | 'accounting'
  | 'spareparts'
  | 'real-estate'
  | 'restaurant'
  | 'vehicle-export'
  | 'hr'
  | 'projects'
  | 'studio';

export type PolicyCategory =
  | 'financial'
  | 'customer_comms'
  | 'inventory'
  | 'regulatory'
  | 'data_export';

export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'ESCALATED';

export type QueueItemStatus =
  | 'queued'
  | 'processing'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'dead_letter'
  | 'cancelled';

export type SimulationStepStatus = 'pass' | 'warn' | 'fail';

export type ExecutionHealth = 'healthy' | 'attention' | 'critical';

export type AIExperienceMode = 'simple' | 'advanced';

export interface DomainEvent {
  id: string;
  tenantId: string;
  module: DomainModule;
  entity: string;
  event: string;
  occurredAt: string;
  actorType: 'user' | 'system';
  actorId: string;
  correlationId: string;
  payload: Record<string, unknown>;
}

export interface WorkflowStepDefinition {
  id: string;
  kind: 'condition' | 'ai_decision' | 'action' | 'delay' | 'notification';
  config: Record<string, unknown>;
}

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  name: string;
  version: number;
  trigger: { event: string; filters: Record<string, unknown> };
  steps: WorkflowStepDefinition[];
  policyProfileId: string;
  enabled: boolean;
}

export interface WorkflowVersionRecord {
  id: string;
  workflowId: string;
  tenantId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  reason: string;
  snapshot: WorkflowDefinition & {
    description?: string | null;
    approvalsMode?: 'always' | 'policy' | 'never';
    moduleScope?: string;
    archived?: boolean;
  };
}

export interface WorkflowQueueFailure {
  attempt: number;
  at: string;
  error: string;
}

export interface WorkflowQueueItem {
  id: string;
  workflowId: string;
  tenantId: string;
  correlationId: string;
  idempotencyKey: string;
  status: QueueItemStatus;
  source: 'event' | 'manual' | 'retry' | 'system';
  requestedBy: string;
  triggerData: Record<string, unknown>;
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string;
  executionId?: string;
  failureHistory: WorkflowQueueFailure[];
}

export interface WorkflowSimulationResult {
  workflowId: string;
  simulatedAt: string;
  success: boolean;
  summary: string;
  steps: Array<{
    id: string;
    kind: WorkflowStepDefinition['kind'];
    status: SimulationStepStatus;
    message: string;
  }>;
}

export interface PolicyDecision {
  allow: boolean;
  requiresApproval: boolean;
  riskScore: number;
  reasonCodes: string[];
}

export interface AdapterExecutionContext {
  tenantId: string;
  userId: string;
  correlationId: string;
}

export interface ActionAdapter {
  module: DomainModule;
  action: string;
  category: PolicyCategory;
  description: string;
  validate(input: Record<string, unknown>): Promise<{ valid: boolean; errors: string[] }>;
  execute(
    input: Record<string, unknown>,
    ctx: AdapterExecutionContext
  ): Promise<{ ok: boolean; output: Record<string, unknown> }>;
}

export interface ApprovalNotification {
  id: string;
  type: 'created' | 'assignment' | 'escalated' | 'reminder' | 'resolved';
  sentAt: string;
  recipient: string;
  channel: string;
  summary: string;
}

export interface ApprovalEscalationRecord {
  id: string;
  level: number;
  fromRole?: string;
  toRole: string;
  escalatedAt: string;
  reason: string;
  escalatedBy: string;
}

export interface ApprovalItem {
  id: string;
  tenantId: string;
  module: DomainModule;
  title: string;
  summary: string;
  requestedBy: string;
  riskScore: number;
  actionCategory: PolicyCategory;
  status: ApprovalStatus;
  createdAt: string;
  dueAt: string;
  correlationId: string;
  payload: Record<string, unknown>;
  assignedToUserId?: string;
  assignedRole?: string;
  assignmentChain: string[];
  escalationLevel: number;
  notifications: ApprovalNotification[];
  escalationHistory: ApprovalEscalationRecord[];
  executionRequest?: {
    module: DomainModule;
    action: string;
    input: Record<string, unknown>;
    requestedByUserId: string;
  };
  executionResult?: {
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    actedAt: string;
    actedBy: string;
    note?: string;
    output?: Record<string, unknown>;
    error?: string;
  };
}

export interface PolicyProfile {
  id: string;
  name: string;
  category: PolicyCategory;
  description: string;
  approvalThreshold: number;
  autoApproveBelow: number;
  active: boolean;
  approverRoles: string[];
  escalationRoles: string[];
  separationOfDuties: boolean;
  approvalSlaMinutes: number;
}

export interface CopilotConfig {
  id: string;
  module: DomainModule;
  label: string;
  enabled: boolean;
  allowedIntents: string[];
  dataSources: string[];
  responseMode: 'suggest_only' | 'draft_then_approve' | 'action_with_approval';
  actionPermissions: string[];
  systemPromptId?: string | null;
  welcomeMessage?: string | null;
}

export interface IntegrationConfig {
  id: string;
  key: string;
  label: string;
  status: 'connected' | 'attention' | 'disconnected';
  scope: string;
  retryPolicy: string;
  authMode: string;
  endpoint?: string | null;
  secretLabel?: string | null;
  lastCheckedAt?: string | null;
}

export interface AIControlPlaneSettings {
  retentionDays: number;
  alertChannels: string[];
  defaultPolicyProfileId: string;
  diagnosticsEnabled: boolean;
  brandingTone: string;
  defaultApproverChain: string[];
  maxExecutionAttempts: number;
  retryBackoffMinutes: number;
  escalationSlaMinutes: number;
  queuePollingIntervalSeconds: number;
}

export interface OnboardingChecklistState {
  connectModel: boolean;
  chooseDefaultPolicy: boolean;
  enableCopilot: boolean;
  publishFirstAutomation: boolean;
  reviewApprovalInbox: boolean;
  dismissed: boolean;
}

export interface AIUserExperiencePreferences {
  mode: AIExperienceMode;
  lastVisitedSection: string;
  onboardingChecklist: OnboardingChecklistState;
}

export interface WorkflowTemplateRecord {
  id: string;
  name: string;
  category: string;
  modules: string[];
  safetyProfile: string;
  description: string;
}

export interface TenantAIConfig {
  settings: AIControlPlaneSettings;
  pendingApprovals: ApprovalItem[];
  policyProfiles: PolicyProfile[];
  copilots: CopilotConfig[];
  integrations: IntegrationConfig[];
  workflowTemplates: WorkflowTemplateRecord[];
  executionQueue: WorkflowQueueItem[];
  deadLetterQueue: WorkflowQueueItem[];
  workflowVersions: WorkflowVersionRecord[];
  userPreferences: Record<string, AIUserExperiencePreferences>;
}

export interface RegistryItem {
  id: string;
  source: 'studio-workflow' | 'legacy-rule';
  name: string;
  description: string;
  module: string;
  trigger: string;
  owner: string;
  status: 'active' | 'paused' | 'draft' | 'archived';
  runCount: number;
  updatedAt: string;
  policyProfileId: string;
  version: number;
}

export interface AgentRecord {
  id: string;
  name: string;
  type: string;
  description: string;
  active: boolean;
  tasksCompleted: number;
  successRate: number;
  lastRunAt: string | null;
  modelLabel: string;
  allowedTools: string[];
}

export interface ModelRecord {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  description: string | null;
  capabilities: string[];
  contextWindow: number;
  maxTokens: number | null;
  temperature: number;
  apiEndpoint: string | null;
  isDefault: boolean;
  isActive: boolean;
  lastUsedAt: string | null;
  totalCost: number;
  totalTokens: number;
}

export interface PromptRecord {
  id: string;
  name: string;
  description: string | null;
  category: string;
  template: string;
  modelId: string | null;
  isActive: boolean;
  usageCount: number;
  variables: string[];
  updatedAt: string;
}

export interface EventRecord {
  id: string;
  module: string;
  event: string;
  entity: string;
  occurredAt: string;
  status: 'processed' | 'queued' | 'ignored';
  correlationId: string;
}

export interface AuditRecord {
  id: string;
  action: string;
  integration: string;
  status: string;
  createdAt: string;
  summary: string;
  details: Record<string, unknown>;
}

export interface PredictiveInsight {
  id: string;
  module: DomainModule;
  type: string;
  title: string;
  summary: string;
  score: number;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
  generatedAt: string;
  data: Record<string, unknown>;
}

export interface AuditEvidenceBundle {
  tenantId: string;
  generatedAt: string;
  settings: AIControlPlaneSettings;
  policies: PolicyProfile[];
  approvals: ApprovalItem[];
  queue: WorkflowQueueItem[];
  deadLetters: WorkflowQueueItem[];
  workflowVersions: WorkflowVersionRecord[];
  recentEvents: EventRecord[];
  recentAudit: AuditRecord[];
  counts: {
    approvals: number;
    queue: number;
    deadLetters: number;
    workflowVersions: number;
    recentEvents: number;
    recentAudit: number;
  };
}

export interface CommandCenterPayload {
  summary: {
    activeWorkflows: number;
    pendingApprovals: number;
    failedRuns: number;
    activeAgents: number;
    unreadInsights: number;
    monthlyModelCost: number;
  };
  setupProgress: {
    completed: number;
    total: number;
    items: OnboardingChecklistState;
  };
  roleFocus: {
    title: string;
    description: string;
  };
  alerts: Array<{
    id: string;
    title: string;
    severity: string;
    message: string;
    createdAt: string;
  }>;
  pendingApprovals: ApprovalItem[];
  failedRuns: Array<{
    id: string;
    workflowName: string;
    status: string;
    startedAt: string;
    error: string;
  }>;
  moduleHeatmap: Array<{
    module: DomainModule;
    automationCount: number;
    copilotEnabled: boolean;
    approvalBacklog: number;
    health: ExecutionHealth;
  }>;
  assistantReadiness: Array<{
    module: DomainModule;
    label: string;
    status: 'ready' | 'setup_needed' | 'attention';
    description: string;
  }>;
}

export interface AnalyticsPayload {
  kpis: Array<{
    label: string;
    value: string;
    trend: string;
  }>;
  throughput: Array<{ period: string; runs: number; approvals: number }>;
  predictions: PredictiveInsight[];
  queueHealth: {
    pending: number;
    retrying: number;
    deadLetters: number;
    averageAttempts: string;
  };
}

export interface WorkflowCreateInput {
  name: string;
  description?: string;
  moduleScope: string;
  triggerEvent: string;
  filters?: Record<string, unknown>;
  steps?: WorkflowStepDefinition[];
  policyProfileId: string;
  approvalsMode: 'always' | 'policy' | 'never';
  isActive?: boolean;
}

export interface ActionFieldOption {
  label: string;
  value: string;
}

export interface ActionFieldSchema {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'email' | 'select' | 'boolean' | 'list';
  required?: boolean;
  placeholder?: string;
  options?: ActionFieldOption[];
  rows?: number;
}

export interface ActionAdapterUIMetadata {
  module: DomainModule;
  action: string;
  label: string;
  shortDescription: string;
  category: string;
  icon: string;
  successLabel: string;
  fields: ActionFieldSchema[];
  summaryTemplate: string;
}

export interface EventCatalogItem {
  id: string;
  module: DomainModule;
  entity: string;
  event: string;
  label: string;
  description: string;
  category: string;
}

export interface AgentCreateInput {
  name: string;
  description?: string;
  type: string;
  moduleScope: string;
  allowedTools?: string[];
  modelId?: string | null;
  escalationPolicy?: string;
  isActive?: boolean;
}
