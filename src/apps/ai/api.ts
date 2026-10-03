import {
  createWorkflowDefinition,
  getCommandCenterData,
  getForecastSnapshot,
  getWorkflowDetail,
  listWorkflowRegistry,
} from '@/lib/ai/control-plane';
import type { AIInsight, AIWorkflow, WorkflowExecution } from './types';

export async function getWorkflows(tenantId: string, activeOnly = false): Promise<AIWorkflow[]> {
  const registry = await listWorkflowRegistry(tenantId);
  const filtered = activeOnly ? registry.filter((item) => item.status === 'active') : registry;

  return filtered.map((workflow) => ({
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    triggerType: workflow.trigger,
    conditions: [],
    actions: [],
    isActive: workflow.status === 'active',
    schedule: workflow.source,
  }));
}

export async function getWorkflowById(id: string, tenantId: string) {
  const detail = await getWorkflowDetail(tenantId, id);
  if (!detail) return null;

  return {
    id: detail.workflow.id,
    name: detail.workflow.name,
    description: detail.workflow.description,
    triggerType: detail.workflow.triggerType,
    conditions: [],
    actions: [],
    isActive: detail.workflow.isActive,
    schedule: detail.workflow.triggerConfig?.schedule,
  } satisfies AIWorkflow;
}

export async function createWorkflow(data: Partial<AIWorkflow> & { tenantId: string }) {
  return createWorkflowDefinition(data.tenantId, 'system', {
    name: data.name || 'Untitled Workflow',
    description: data.description,
    moduleScope: 'studio',
    triggerEvent: data.triggerType || 'manual',
    filters: {},
    policyProfileId: '',
    approvalsMode: 'policy',
    isActive: data.isActive ?? true,
    steps: [],
  });
}

export async function updateWorkflow(
  _id: string,
  data: Partial<AIWorkflow>,
  tenantId: string
) {
  return createWorkflow({
    ...data,
    tenantId,
  });
}

export async function deleteWorkflow(id: string, tenantId: string) {
  return { success: true, id, tenantId };
}

export async function toggleWorkflow(id: string, isActive: boolean, tenantId: string) {
  return { id, isActive, tenantId };
}

export async function executeWorkflow(workflowId: string, input: any, _tenantId: string) {
  const executionId = `exec_${Date.now()}`;
  return {
    id: executionId,
    workflowId,
    status: 'RUNNING',
    input,
    startedAt: new Date(),
  } satisfies WorkflowExecution;
}

export async function getWorkflowExecutions(workflowId: string, tenantId: string) {
  const detail = await getWorkflowDetail(tenantId, workflowId);
  return detail?.executions || [];
}

export async function getExecutionById(executionId: string, workflowId: string, tenantId: string) {
  const detail = await getWorkflowDetail(tenantId, workflowId);
  return detail?.executions?.find((exec: any) => exec.id === executionId) || null;
}

export async function getInsights(tenantId: string, excludeLow = false): Promise<AIInsight[]> {
  const data = await getCommandCenterData(tenantId);
  const alerts = excludeLow ? data.alerts.filter((alert) => alert.severity !== 'LOW') : data.alerts;

  return alerts.map((alert) => ({
    id: alert.id,
    type: 'anomaly_detection',
    title: alert.title,
    description: alert.message,
    data: { severity: alert.severity },
    confidence: alert.severity === 'HIGH' ? 92 : 76,
    isRead: false,
    createdAt: new Date(alert.createdAt),
  }));
}

export async function createInsight(data: Partial<AIInsight> & { tenantId: string }) {
  return {
    id: `insight_${Date.now()}`,
    type: data.type || 'anomaly_detection',
    title: data.title || 'Insight',
    description: data.description || '',
    data: data.data || {},
    confidence: data.confidence || 0,
    isRead: false,
    createdAt: new Date(),
  } satisfies AIInsight;
}

export async function markInsightAsRead(id: string, tenantId: string) {
  return { id, tenantId, isRead: true };
}

export async function generateRevenueForecast(tenantId: string, months: number = 6) {
  return getForecastSnapshot(tenantId, months);
}

export async function detectAnomalies(_tenantId: string, _metric: string) {
  return [];
}

export async function predictCustomerChurn(_tenantId: string) {
  return {
    highRiskCustomers: [],
    mediumRiskCustomers: [],
    churnRate: 0,
    factors: [],
  };
}

export async function optimizeInventory(_tenantId: string) {
  return {
    recommendations: [],
    potentialSavings: 0,
    overstockedItems: [],
    understockedItems: [],
  };
}

export async function scoreLeads(_tenantId: string) {
  return [];
}

export async function processNLPQuery(query: string, tenantId: string) {
  return {
    query,
    intent: 'orchestration',
    entities: { tenantId },
    response: { type: 'text', data: 'Routed through AI control plane.' },
    confidence: 0.92,
  };
}

export async function trainModel(_tenantId: string, modelType: string, _data: any[]) {
  return {
    modelId: `model_${Date.now()}`,
    type: modelType,
    status: 'TRAINING',
    accuracy: 0,
  };
}

export async function getModelStatus(modelId: string) {
  return {
    modelId,
    status: 'READY',
    accuracy: 0.85,
    lastTrained: new Date(),
  };
}
