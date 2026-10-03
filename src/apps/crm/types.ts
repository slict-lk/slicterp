export type CrmEntityStatus = string;

export interface CrmPipeline {
  id: string;
  tenantId: string;
  branchId?: string | null;
  name: string;
  code?: string | null;
  isDefault: boolean;
  active: boolean;
  allowStageSkip: boolean;
  allowBackwardMove: boolean;
  requireStageApproval: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface CrmStage {
  id: string;
  tenantId: string;
  pipelineId: string;
  name: string;
  code?: string | null;
  sequence: number;
  probabilityPercent: number;
  isClosed: boolean;
  isWon: boolean;
  requiresApproval: boolean;
  editRestricted: boolean;
}

export interface CrmLead {
  id: string;
  tenantId: string;
  branchId?: string | null;
  pipelineId?: string | null;
  stageId?: string | null;
  customerAccountId?: string | null;
  partyId?: string | null;
  ownerUserId?: string | null;
  source?: string | null;
  title?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  status: CrmEntityStatus;
  priority: string;
  score: number;
  expectedRevenue?: number | null;
  probabilityPercent?: number | null;
  nextActionAt?: string | Date | null;
  enteredStageAt?: string | Date | null;
  notes?: string | null;
}

export interface CrmOpportunity {
  id: string;
  tenantId: string;
  branchId?: string | null;
  pipelineId?: string | null;
  stageId?: string | null;
  customerAccountId?: string | null;
  partyId?: string | null;
  leadId?: string | null;
  ownerUserId?: string | null;
  name: string;
  description?: string | null;
  amount: number;
  currency: string;
  probabilityPercent: number;
  expectedCloseDate?: string | Date | null;
  status: string;
  priority: string;
  nextActionAt?: string | Date | null;
  enteredStageAt?: string | Date | null;
  approvalRequired: boolean;
}

export interface CrmActivity {
  id: string;
  tenantId: string;
  activityType: string;
  subject?: string | null;
  description?: string | null;
  status: string;
  dueAt?: string | Date | null;
  completedAt?: string | Date | null;
  leadId?: string | null;
  opportunityId?: string | null;
  accountId?: string | null;
}

export interface CrmTask {
  id: string;
  tenantId: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  dueAt?: string | Date | null;
  completedAt?: string | Date | null;
  leadId?: string | null;
  opportunityId?: string | null;
  accountId?: string | null;
  assignedToUserId?: string | null;
}

