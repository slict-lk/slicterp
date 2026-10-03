// PHASE 3: AI & Automation Module Types

export interface AIWorkflow {
  id: string;
  name: string;
  description?: string;
  triggerType: string; // Event that triggers workflow
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isActive: boolean;
  schedule?: string;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface WorkflowAction {
  type: 'send_email' | 'create_task' | 'update_field' | 'webhook' | 'ai_analyze';
  config: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface AIInsight {
  id: string;
  type: 'revenue_forecast' | 'anomaly_detection' | 'customer_churn' | 'inventory_optimization';
  title: string;
  description: string;
  data: Record<string, any>;
  confidence: number; // 0-100
  isRead: boolean;
  createdAt: Date;
}

export interface PredictiveAnalytics {
  type: string;
  predictions: Prediction[];
  accuracy: number;
  lastUpdated: Date;
}

export interface Prediction {
  period: string;
  value: number;
  confidence: number;
  factors: Record<string, number>;
}

export interface AnomalyDetection {
  id: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: Date;
}

export interface NLPQuery {
  query: string;
  intent: string;
  entities: Record<string, any>;
  response: any;
  confidence: number;
}
