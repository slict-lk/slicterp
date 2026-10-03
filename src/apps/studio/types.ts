export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'file'
  | 'image'
  | 'json'
  | 'email'
  | 'phone'
  | 'url'
  | 'currency'
  | 'percentage'
  | 'richtext'
  | 'textarea'
  | 'lookup';

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  custom?: string;
  [key: string]: any;
}

export interface FieldSettings {
  placeholder?: string;
  helpText?: string;
  currencyCode?: string;
  decimals?: number;
  dateIncludeTime?: boolean;
  minDate?: string;
  maxDate?: string;
  labelWhenTrue?: string;
  labelWhenFalse?: string;
  maxSelections?: number;
  targetModuleSlug?: string;
  displayField?: string;
  [key: string]: any;
}

export interface CustomModuleField {
  id: string;
  moduleId: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: FieldValidation;
  sequence: number;
  isSystem: boolean;
  settings?: FieldSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModuleView {
  type: 'list' | 'form' | 'kanban' | 'calendar';
  name: string;
  config: Record<string, any>;
}

export interface CustomModule {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  schema: { fields: string[]; relations: string[] };
  views?: ModuleView[];
  settings?: Record<string, any>;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
  fields?: CustomModuleField[];
  _count?: { records: number };
}

export interface CustomRecord {
  id: string;
  moduleId: string;
  tenantId: string;
  data: Record<string, any>;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// DASHBOARD TYPES
// ----------------------------------------------------------------------------

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type WidgetType = 'metric' | 'chart' | 'table' | 'list' | 'calendar';

export interface MetricWidgetConfig {
  metric: string;
  trend?: boolean;
  percentageChange?: boolean;
  filters?: Record<string, any>;
  dateRange?: string;
  refreshInterval?: number;
}

export interface ChartWidgetConfig {
  chartType: 'line' | 'bar' | 'pie' | 'area';
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange?: string;
  refreshInterval?: number;
}

export interface TableWidgetConfig {
  columns: string[];
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface ListWidgetConfig {
  metric: string;
  groupBy: string;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CalendarWidgetConfig {
  dateField: string;
  titleField: string;
  colorField?: string;
  filters?: Record<string, any>;
}

export interface DashboardWidget {
  id: string;
  dashboardId: string;
  title: string;
  type: WidgetType;
  dataSource: string;
  config: MetricWidgetConfig | ChartWidgetConfig | TableWidgetConfig | ListWidgetConfig | CalendarWidgetConfig | Record<string, any>;
  position: WidgetPosition;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudioDashboard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  icon?: string;
  layout: { cols: number; rows: number; items: { widgetId: string; x: number; y: number; w: number; h: number }[] };
  isDefault: boolean;
  isPublished: boolean;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
  widgets?: DashboardWidget[];
}

// ----------------------------------------------------------------------------
// DATA SOURCE TYPES
// ----------------------------------------------------------------------------

export interface DataSourceMetric {
  id: string;
  name: string;
  type: 'number' | 'currency' | 'percentage';
  description?: string;
}

export interface DataSourceDescriptor {
  id: string;
  name: string;
  description: string;
  availableMetrics: DataSourceMetric[];
}

export interface AggregateResult {
  group: string;
  value: number;
}

export interface TimeSeriesResult {
  date: string;
  value: number;
}

export interface DataConnectorResult {
  data: any;
  error?: string;
}

// ----------------------------------------------------------------------------
// WORKFLOW TYPES
// ----------------------------------------------------------------------------

export type TriggerNodeType = 'record_created' | 'record_updated' | 'record_deleted' | 'scheduled' | 'webhook' | 'manual';

export interface StudioWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  triggerType: TriggerNodeType;
  triggerConfig?: Record<string, any>;
  nodes: any[];
  edges: any[];
  isActive: boolean;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  triggerData?: Record<string, any>;
  steps?: { nodeId: string; status: string; startedAt: string; completedAt?: string; output?: any; error?: string }[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// ----------------------------------------------------------------------------
// INPUT TYPES
// ----------------------------------------------------------------------------

export type CreateModuleInput = Omit<CustomModule, 'id' | 'tenantId' | 'slug' | 'createdAt' | 'updatedAt' | 'fields' | '_count'> & { fields?: CreateFieldInput[] };
export type UpdateModuleInput = Partial<Omit<CustomModule, 'id' | 'tenantId' | 'slug' | 'createdAt' | 'updatedAt' | 'fields' | '_count'>>;

export type CreateFieldInput = Omit<CustomModuleField, 'id' | 'moduleId' | 'createdAt' | 'updatedAt'>;
export type UpdateFieldInput = Partial<Omit<CustomModuleField, 'id' | 'moduleId' | 'createdAt' | 'updatedAt'>>;

export type CreateRecordInput = { data: Record<string, any> };
export type UpdateRecordInput = { data: Record<string, any> };

export type CreateDashboardInput = Omit<StudioDashboard, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'widgets'> & { widgets?: any[] };
export type UpdateDashboardInput = Partial<Omit<StudioDashboard, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'widgets'>> & { widgets?: any[] };

export type CreateWidgetInput = Omit<DashboardWidget, 'id' | 'dashboardId' | 'createdAt' | 'updatedAt'>;
export type UpdateWidgetInput = Partial<Omit<DashboardWidget, 'id' | 'dashboardId' | 'createdAt' | 'updatedAt'>>;

export type CreateWorkflowInput = Omit<StudioWorkflow, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;
export type UpdateWorkflowInput = Partial<Omit<StudioWorkflow, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>;

// ----------------------------------------------------------------------------
// FILTER AND PAGINATION TYPES
// ----------------------------------------------------------------------------

export interface PaginationParams {
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ModuleFilters extends PaginationParams {
  search?: string;
  isActive?: boolean;
}

export interface RecordFilters extends PaginationParams {
  search?: string;
  where?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  skip: number;
  take: number;
}
