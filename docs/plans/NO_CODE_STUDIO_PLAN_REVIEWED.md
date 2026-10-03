# No-Code Studio — Complete Implementation Plan (Reviewed & Perfected)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully functional No-Code Studio module that lets tenants create custom data modules, enter records, build dashboards with cross-module data, and design visual automation workflows — all without code.

**Architecture:** JSON-schema-driven dynamic modules stored in PostgreSQL via Prisma. Custom records use a `data Json` column for flexibility. Dashboards pull from both custom modules AND existing ERP modules (Accounting, CRM, Inventory, Sales, HR, etc.) via a data connector registry. Workflows use ReactFlow for visual design with server-side execution engine.

**Tech Stack:** Next.js (App Router), Prisma (PostgreSQL), React, TypeScript, shadcn/ui, react-flow-renderer (v10.3.17), Recharts, Tailwind CSS, Zod, React Hook Form, TanStack React Query

---

## Pre-Implementation: Dependencies

### Task 0.1: Install Missing Dependencies

The following packages are **already installed** and available:
- `react-flow-renderer` ^10.3.17 (workflow designer)
- `recharts` ^2.12.0 (charts)
- `zod` ^3.23.0 (validation)
- `react-hook-form` ^7.51.0 (forms)
- `@tanstack/react-query` ^5.35.0 (data fetching)
- `zustand` ^4.5.0 (state)
- `framer-motion` ^11.18.2 (animations)
- `lucide-react` ^0.454.0 (icons)
- All `@radix-ui/*` primitives (14 packages)

**Need to install:**
```bash
pnpm add papaparse
pnpm add -D @types/papaparse
```
- `papaparse` — CSV import/export for record bulk operations

> **Note:** `react-flow-renderer` v10.3.17 is already installed. Do NOT install `@xyflow/react` (v12+) — it has a different API. All workflow code must use the `react-flow-renderer` import paths.

> **Note:** Drag-and-drop for field reordering can be implemented with native HTML5 drag events or the existing `framer-motion` Reorder API (`<Reorder.Group>` / `<Reorder.Item>`). No need for `@dnd-kit`.

---

## Phase 1: Database Foundation

### Task 1.1: Prisma Schema — Studio Models

**Files:**
- Modify: `prisma/schema.prisma`

**IMPORTANT — Existing Models to Be Aware Of:**
The schema already contains `AutomationRule` and `AutomationExecution` models (at ~line 2103) with enum types `TriggerType`, `ActionType`, `ExecutionStatus`. The plan's new `AutomationRule` and `AutomationExecution` models **conflict** with existing ones.

**Resolution Strategy:** The existing `AutomationRule` / `AutomationExecution` models should be **kept as-is** and enhanced (add missing fields like `runCount`, `createdById`). Do NOT create duplicate models. The plan's `StudioWorkflow` and `WorkflowExecution` models are genuinely new and should be added.

Add these models to `schema.prisma` (after existing models, before enums at ~line 4748):

```prisma
// ============================================================================
// NO-CODE STUDIO MODELS
// ============================================================================

model CustomModule {
  id          String              @id @default(cuid())
  tenantId    String
  name        String
  slug        String              // URL-safe name, auto-generated
  icon        String?             @default("database")
  description String?
  isActive    Boolean             @default(true)
  schema      Json                // { fields: [], relations: [] }
  views       Json?               // [{ type, name, config }]
  settings    Json?               // module-level settings
  createdById String?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  tenant      Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  records     CustomRecord[]
  fields      CustomModuleField[]

  @@unique([tenantId, slug])
  @@index([tenantId])
  @@index([isActive])
}

model CustomModuleField {
  id           String       @id @default(cuid())
  moduleId     String
  name         String       // internal name (snake_case)
  label        String       // display label
  type         String       // text, number, date, boolean, select, multiselect, file, json, email, phone, url, currency, textarea, lookup
  required     Boolean      @default(false)
  defaultValue Json?
  options      Json?        // for select/multiselect: ["Option A", "Option B"]
  validation   Json?        // { min, max, pattern, custom }
  sequence     Int          @default(0)
  isSystem     Boolean      @default(false)  // system fields can't be deleted
  settings     Json?        // field-specific settings (placeholder, helpText, etc.)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  module       CustomModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@unique([moduleId, name])
  @@index([moduleId])
  @@index([sequence])
}

model CustomRecord {
  id          String       @id @default(cuid())
  moduleId    String
  tenantId    String
  data        Json         // { field_name: value, ... }
  createdById String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  module      CustomModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@index([moduleId])
  @@index([tenantId])
  @@index([createdAt])
}

model StudioDashboard {
  id          String            @id @default(cuid())
  tenantId    String
  name        String
  description String?
  icon        String?           @default("layout-dashboard")
  layout      Json              // { cols, rows, items: [{ widgetId, x, y, w, h }] }
  isDefault   Boolean           @default(false)
  isPublished Boolean           @default(true)
  createdById String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  widgets     DashboardWidget[]

  @@index([tenantId])
  @@index([isDefault])
}

model DashboardWidget {
  id          String          @id @default(cuid())
  dashboardId String
  title       String
  type        String          // metric, chart, table, list, calendar
  dataSource  String          // "custom:module_slug" or "erp:accounting.invoices"
  config      Json            // { chartType, metrics, dimensions, filters, dateRange, refreshInterval }
  position    Json            // { x, y, w, h }
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  dashboard   StudioDashboard @relation(fields: [dashboardId], references: [id], onDelete: Cascade)

  @@index([dashboardId])
}

model StudioWorkflow {
  id            String              @id @default(cuid())
  tenantId      String
  name          String
  description   String?
  triggerType   String              // record_created, record_updated, record_deleted, scheduled, webhook, manual
  triggerConfig Json?               // { moduleId, cronExpression, webhookSecret }
  nodes         Json                // ReactFlow nodes array
  edges         Json                // ReactFlow edges array
  isActive      Boolean             @default(false)
  createdById   String?
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  executions    WorkflowExecution[]

  @@index([tenantId])
  @@index([isActive])
  @@index([triggerType])
}

model WorkflowExecution {
  id          String         @id @default(cuid())
  workflowId  String
  status      String         @default("running") // running, completed, failed, cancelled
  triggerData Json?          // the data that triggered this execution
  steps       Json?          // [{ nodeId, status, startedAt, completedAt, output, error }]
  startedAt   DateTime       @default(now())
  completedAt DateTime?
  error       String?
  workflow    StudioWorkflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  @@index([workflowId])
  @@index([status])
  @@index([startedAt])
}
```

**Modify existing `AutomationRule` model** (at ~line 2103) — add missing fields:

```prisma
// ADD these fields to the existing AutomationRule model:
  runCount      Int                   @default(0)
  createdById   String?
```

Also update the **Tenant model** (at line 9) to add the relation:

```prisma
// Add this line to the Tenant model's relations section:
  customModules        CustomModule[]
```

> **CRITICAL:** Do NOT create new `AutomationRule` / `AutomationExecution` models. They already exist with enum-based `triggerType` (`TriggerType` enum: SCHEDULE, EVENT, WEBHOOK, MANUAL) and `status` (`ExecutionStatus` enum: SUCCESS, FAILED, PARTIAL). The Studio automation features should use these existing models and enhance them.

**Verification:**
```bash
npx prisma validate
```
Should output "Your schema is valid!"

### Task 1.2: Run Migration

```bash
npx prisma migrate dev --name add-studio-models
npx prisma generate
```

**Verification:** Migration applies successfully, new tables visible in database.

---

## Phase 2: Business Logic Layer

### Task 2.1: Studio Types

**Files:**
- Overwrite: `src/apps/studio/types.ts`

The existing file has 129 lines of basic interfaces. Replace with complete TypeScript definitions:

- All interfaces matching the new Prisma models (CustomModule, CustomModuleField, CustomRecord, StudioDashboard, DashboardWidget, StudioWorkflow, WorkflowExecution)
- Input types: `CreateModuleInput`, `UpdateModuleInput`, `CreateFieldInput`, `UpdateFieldInput`, `CreateRecordInput`, `UpdateRecordInput`, `CreateDashboardInput`, `UpdateDashboardInput`, `CreateWidgetInput`, `UpdateWidgetInput`, `CreateWorkflowInput`, `UpdateWorkflowInput`
- Filter/pagination types: `ModuleFilters`, `RecordFilters`, `PaginationParams`, `PaginatedResponse<T>`
- Data connector types: `DataSourceDescriptor`, `DataSourceMetric`, `DataConnectorResult`, `AggregateResult`, `TimeSeriesResult`
- Extended field types: add `email`, `phone`, `url`, `currency`, `textarea`, `lookup` to the `FieldType` union (current types only has 8, need 14)
- Widget config types: `MetricWidgetConfig`, `ChartWidgetConfig`, `TableWidgetConfig`, `ListWidgetConfig`, `CalendarWidgetConfig`
- Workflow node types: `TriggerNodeData`, `ConditionNodeData`, `ActionNodeData`, `DelayNodeData`

### Task 2.2: Studio API (Core CRUD)

**Files:**
- Overwrite: `src/apps/studio/api.ts`

The existing file has 32 lines of stubs returning empty arrays. Replace with full Prisma implementations.

**Pattern to follow** (matching existing codebase conventions):
```typescript
import prisma from '@/lib/prisma';
// Use prisma directly, tenant isolation via where clauses
// Return raw Prisma results (API routes handle formatting)
```

Functions to implement:

| Function | Purpose |
|----------|---------|
| `getCustomModules(tenantId, filters?)` | List with search, pagination, active filter |
| `getCustomModuleBySlug(tenantId, slug)` | Detail with fields, include `_count: { select: { records: true } }` |
| `getCustomModuleById(tenantId, id)` | Detail with fields |
| `createCustomModule(data)` | Create module + auto-generate slug from name + system fields (created_at, updated_at) |
| `updateCustomModule(id, tenantId, data)` | Update module metadata (always pass tenantId for isolation) |
| `deleteCustomModule(id, tenantId)` | Soft-delete (set isActive=false) |
| `getCustomModuleFields(moduleId)` | List fields ordered by sequence |
| `createCustomModuleField(data)` | Add field to module |
| `updateCustomModuleField(id, data)` | Update field |
| `deleteCustomModuleField(id)` | Remove field |
| `reorderFields(moduleId, fieldIds[])` | Batch update sequence |
| `getCustomRecords(moduleId, tenantId, filters?)` | List with search, sort, pagination |
| `getCustomRecordById(id)` | Single record detail |
| `createCustomRecord(data)` | Create with field validation against module schema |
| `updateCustomRecord(id, data)` | Update with field validation |
| `deleteCustomRecord(id)` | Hard delete |
| `bulkDeleteRecords(ids[])` | Batch delete with `deleteMany` |

**Slug generation:** Use a helper like `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')` + uniqueness check.

**Tenant isolation:** Every query MUST include `tenantId` in the `where` clause. Never trust client-supplied tenantId — override with session tenant in API routes.

### Task 2.3: Dashboard API

**Files:**
- Create: `src/apps/studio/dashboard-api.ts`

| Function | Purpose |
|----------|---------|
| `getDashboards(tenantId)` | List all dashboards for tenant |
| `getDashboardById(id, tenantId)` | Detail with widgets (tenant-scoped) |
| `createDashboard(data)` | Create with default layout |
| `updateDashboard(id, tenantId, data)` | Update layout/metadata |
| `deleteDashboard(id, tenantId)` | Delete dashboard & cascade widgets |
| `createWidget(dashboardId, data)` | Add widget to dashboard |
| `updateWidget(id, data)` | Update widget config |
| `deleteWidget(id)` | Remove widget |
| `getWidgetData(widget, tenantId)` | Fetch data by source (delegates to data connectors) |

### Task 2.4: Data Source Connectors

**Files:**
- Create: `src/apps/studio/data-connectors.ts`

Registry pattern — a map of data source IDs to connector functions. Each connector queries existing Prisma models.

| Data Source ID | Prisma Model(s) | Available Metrics |
|----------------|-----------------|-------------------|
| `erp:accounting.invoices` | `Invoice` | count, totalAmount (sum), byStatus (group), byMonth (timeSeries) |
| `erp:accounting.payments` | `Payment` | count, totalAmount, byMethod, byMonth |
| `erp:accounting.revenue` | `JournalLine` + `Account` | totalRevenue, byPeriod, byAccount |
| `erp:accounting.journal-entries` | `JournalEntry` | count, byModule, byPeriod |
| `erp:sales.orders` | `SalesOrder` or `SalesOrderV2` | count, totalValue, byStatus, byCustomer |
| `erp:sales.quotations` | `Quotation` or `SalesQuote` | count, totalValue, conversionRate |
| `erp:crm.opportunities` | `CrmOpportunity` | count, pipelineValue, byStage, winRate |
| `erp:crm.leads` | `CrmLead` | count, byStatus, bySource, conversionRate |
| `erp:crm.activities` | `CrmActivity` | count, byType, byUser |
| `erp:inventory.products` | `InvProduct` or `Product` | count, lowStock, byCategory, totalValue |
| `erp:inventory.movements` | `InvStockMovement` or `StockMovement` | count, byType, byWarehouse |
| `erp:inventory.warehouses` | `InvWarehouse` or `Warehouse` | count, utilizationRate |
| `erp:hr.employees` | `Employee` | count, byDepartment, byStatus |
| `erp:hr.leave-requests` | `LeaveRequest` | count, byStatus, byType, pendingCount |
| `erp:hr.attendance` | `Attendance` | presentToday, absentToday, byDepartment |
| `erp:healthcare.patients` | `Patient` | count, byStatus, newThisMonth |
| `erp:healthcare.visits` | `MedicalVisit` | count, byDoctor, byDepartment, byMonth |
| `erp:restaurant.orders` | `POSOrder` | count, revenue, byTable, averageOrderValue |
| `erp:hotel.rooms` | `HotelRoom` | totalRooms, occupied, available, occupancyRate |
| `erp:hotel.bookings` | `HotelBooking` | count, revenue, byStatus, byMonth |
| `erp:spareparts.invoices` | `ShopInvoice` | count, revenue, byProduct, byCustomer |
| `erp:vehicle-export.vehicles` | `ExportVehicle` | count, byStatus, byMake, totalValue |
| `erp:pos.orders` | `POSOrder` | count, revenue, byPaymentMethod |
| `custom:{module_slug}` | `CustomRecord` | count, recordsOverTime, fieldAggregations |

Each connector exposes a standard interface:
```typescript
interface DataConnector {
  id: string;
  name: string;
  description: string;
  availableMetrics: DataSourceMetric[];
  count(tenantId: string, filters?: any): Promise<number>;
  aggregate(tenantId: string, metric: string, groupBy?: string): Promise<AggregateResult[]>;
  timeSeries(tenantId: string, metric: string, period: 'day' | 'week' | 'month' | 'year'): Promise<TimeSeriesResult[]>;
  list(tenantId: string, filters?: any, limit?: number): Promise<any[]>;
}
```

**Data source discovery endpoint:** Returns all available connectors with their metrics so the dashboard builder can show what's available.

### Task 2.5: Workflow API

**Files:**
- Create: `src/apps/studio/workflow-api.ts`

| Function | Purpose |
|----------|---------|
| `getWorkflows(tenantId)` | List workflows with execution counts |
| `getWorkflowById(id, tenantId)` | Detail with full nodes/edges |
| `createWorkflow(data)` | Create with initial trigger node |
| `updateWorkflow(id, tenantId, data)` | Update nodes/edges/metadata |
| `deleteWorkflow(id, tenantId)` | Delete workflow + cascade executions |
| `toggleWorkflow(id, tenantId, isActive)` | Activate/deactivate |
| `executeWorkflow(workflowId, tenantId, triggerData)` | Run workflow engine (see Task 2.7) |
| `getExecutionHistory(workflowId, tenantId)` | Paginated execution log |
| `getExecutionById(executionId)` | Single execution with step details |

### Task 2.6: Automation Rule API (Enhance Existing)

**Files:**
- Create: `src/apps/studio/automation-api.ts`

This wraps the **existing** `AutomationRule` / `AutomationExecution` Prisma models (NOT new models).

| Function | Purpose |
|----------|---------|
| `getAutomationRules(tenantId, filters?)` | List rules with execution counts and pagination |
| `getAutomationRuleById(id, tenantId)` | Single rule detail |
| `createAutomationRule(data)` | Create rule (uses existing Prisma model) |
| `updateAutomationRule(id, tenantId, data)` | Update |
| `deleteAutomationRule(id, tenantId)` | Delete |
| `toggleRule(id, tenantId, isActive)` | Enable/disable |
| `executeRule(ruleId, tenantId, triggerData)` | Run rule actions |
| `getExecutionLog(ruleId, tenantId)` | Paginated history |

### Task 2.7: Workflow Execution Engine (NEW — Missing from Original Plan)

**Files:**
- Create: `src/apps/studio/workflow-engine.ts`

The original plan defines workflow persistence and UI but has **no execution engine**. This is the server-side logic that actually runs workflows.

**Node execution order:**
1. Parse workflow graph (nodes + edges) into execution order (topological sort)
2. Start from trigger node → validate trigger data
3. Execute each node sequentially (following edges)
4. For condition nodes → evaluate expression, follow true/false edge
5. For action nodes → execute action (send email, create record, update field, webhook, notification)
6. Log each step result to `WorkflowExecution.steps` JSON array
7. Handle errors: mark step as failed, optionally continue or halt

**Action executors:**
```typescript
const actionExecutors: Record<string, ActionExecutor> = {
  send_email: async (config, context) => { /* use nodemailer or API */ },
  send_notification: async (config, context) => { /* create in-app notification */ },
  create_record: async (config, context) => { /* create CustomRecord via api */ },
  update_field: async (config, context) => { /* update record field */ },
  webhook: async (config, context) => { /* POST to external URL with axios */ },
  delay: async (config, context) => { /* setTimeout or queue for later */ },
};
```

**Template variable resolution:** Replace `{{record.field_name}}` tokens in action configs with actual record data from trigger context.

### Task 2.8: Record Validation Engine (NEW — Missing from Original Plan)

**Files:**
- Create: `src/apps/studio/validation.ts`

Dynamic validation based on `CustomModuleField` definitions:

```typescript
function validateRecord(data: Record<string, any>, fields: CustomModuleField[]): ValidationResult {
  // For each field:
  //   - Check required fields are present and non-empty
  //   - Validate type (text→string, number→numeric, date→valid date, etc.)
  //   - Validate constraints from field.validation JSON (min, max, pattern)
  //   - Validate select values are in options array
  //   - Validate email format, URL format, phone format
  //   - Return { valid: boolean, errors: { fieldName: string }[] }
}
```

Use **Zod** (already installed) to build dynamic schemas from field definitions at runtime.

---

## Phase 3: API Routes

**Pattern to follow** (from codebase analysis):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.user.tenantId || (await getOrCreateDefaultTenant()).id;
    // ... business logic ...
    return NextResponse.json(formatSuccessResponse(result));
  }, 'Failed to ...');
}
```

### Task 3.1: Custom Module Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `src/app/api/studio/modules/route.ts` | GET, POST | List/create modules (**MODIFY existing stub**) |
| `src/app/api/studio/modules/[id]/route.ts` | GET, PUT, DELETE | Module CRUD |
| `src/app/api/studio/modules/[id]/fields/route.ts` | GET, POST | List/add fields |
| `src/app/api/studio/modules/[id]/fields/[fieldId]/route.ts` | PUT, DELETE | Field CRUD |
| `src/app/api/studio/modules/[id]/fields/reorder/route.ts` | PUT | Reorder fields |

### Task 3.2: Custom Record Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `src/app/api/studio/modules/[id]/records/route.ts` | GET, POST | List/create records |
| `src/app/api/studio/modules/[id]/records/[recordId]/route.ts` | GET, PUT, DELETE | Record CRUD |
| `src/app/api/studio/modules/[id]/records/bulk-delete/route.ts` | POST | Batch delete |
| `src/app/api/studio/modules/[id]/records/export/route.ts` | GET | Export CSV/JSON (use `papaparse`) |
| `src/app/api/studio/modules/[id]/records/import/route.ts` | POST | Import CSV/JSON (use `papaparse`) |

### Task 3.3: Dashboard Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `src/app/api/studio/dashboards/route.ts` | GET, POST | List/create (**MODIFY existing stub**) |
| `src/app/api/studio/dashboards/[id]/route.ts` | GET, PUT, DELETE | Dashboard CRUD |
| `src/app/api/studio/dashboards/[id]/widgets/route.ts` | GET, POST | Widget CRUD |
| `src/app/api/studio/dashboards/[id]/widgets/[widgetId]/route.ts` | PUT, DELETE | Widget detail |
| `src/app/api/studio/data-sources/route.ts` | GET | List available data sources with metrics |
| `src/app/api/studio/data-sources/preview/route.ts` | POST | Preview data for widget configuration |

### Task 3.4: Workflow Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `src/app/api/studio/workflows/route.ts` | GET, POST | List/create |
| `src/app/api/studio/workflows/[id]/route.ts` | GET, PUT, DELETE | Workflow CRUD |
| `src/app/api/studio/workflows/[id]/execute/route.ts` | POST | Trigger execution |
| `src/app/api/studio/workflows/[id]/executions/route.ts` | GET | Execution history |

### Task 3.5: Automation Rule Routes (Enhance Existing)

**IMPORTANT:** An automation rule route already exists at `src/app/api/automation/rules/route.ts` (58 lines, GET + POST). The existing route at `/api/automation/rules` uses `getOrCreateDefaultTenant()` and Prisma queries. The plan should:
1. **Keep** the existing `/api/automation/rules/route.ts` working (for backward compat)
2. **Add** the missing individual rule routes (the `[ruleId]` route that the existing automation page already tries to PATCH)
3. **Add** new Studio-prefixed routes that delegate to the same API layer

| Route | Methods | Purpose |
|-------|---------|---------|
| `src/app/api/automation/rules/[ruleId]/route.ts` | GET, PATCH, DELETE | **NEW** — Individual rule CRUD (fixes existing broken PATCH from automation page) |
| `src/app/api/studio/automation/route.ts` | GET, POST | List/create rules (proxy to same API) |
| `src/app/api/studio/automation/[id]/route.ts` | GET, PUT, DELETE | Rule CRUD |
| `src/app/api/studio/automation/[id]/toggle/route.ts` | PUT | Enable/disable |
| `src/app/api/studio/automation/[id]/executions/route.ts` | GET | Execution log |

---

## Phase 4: Frontend — Studio Hub Page

### Task 4.1: Redesign Studio Hub (Replace Current Monolith)

**Files:**
- Overwrite: `src/app/(dashboard)/studio/page.tsx`

The current 1,076-line monolith page contains all three tabs (Modules, Dashboards, Workflows) with inline ReactFlow. This gets replaced with a **clean Studio Hub** that serves as a navigation center.

**Page Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ░ No-Code Studio                                     [Search]   │
│ Design custom data models, dashboards, and automation           │
│ workflows tailored for every tenant.                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Modules  │ │Dashboards│ │ Workflows│ │  Rules   │          │
│  │    12    │ │     3    │ │     5    │ │    8     │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  ┌─── Your Modules ──────────────────────────────────────────┐ │
│  │ [+ New Module]      [Search...]        [Active ▼]         │ │
│  │                                                            │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │ │
│  │  │ 📋 Warranty  │ │ 📦 Assets    │ │ 👥 Feedback  │      │ │
│  │  │ Claims       │ │ Management   │ │ Tracker      │      │ │
│  │  │              │ │              │ │              │      │ │
│  │  │ 5 fields     │ │ 8 fields     │ │ 4 fields     │      │ │
│  │  │ 142 records  │ │ 56 records   │ │ 23 records   │      │ │
│  │  │ Active ●     │ │ Active ●     │ │ Draft ○      │      │ │
│  │  │              │ │              │ │              │      │ │
│  │  │ [Open] [···] │ │ [Open] [···] │ │ [Open] [···] │      │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─── Recent Dashboards ─────────────────────────────────────┐ │
│  │ [+ New Dashboard]                     [View All →]        │ │
│  │ ┌─────────────────┐ ┌─────────────────┐                  │ │
│  │ │ Executive Panel  │ │ Sales Overview   │                  │ │
│  │ │ 6 widgets        │ │ 4 widgets        │                  │ │
│  │ └─────────────────┘ └─────────────────┘                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─── Active Workflows ──────────────────────────────────────┐ │
│  │ [+ New Workflow]                      [View All →]        │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │  ⚡ "Welcome Email"  │ Trigger: record_created │ ON  │   │ │
│  │ │  ⚡ "Manager Alert"  │ Trigger: field_changed  │ ON  │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Data fetching:** Use `@tanstack/react-query` with `useQuery` for all data fetching (modules list, dashboards list, workflows list, automation rules count). This enables automatic caching, refetching, and loading states.

**Interactive Elements:**
- **Stat cards** — Clickable, navigate to respective sections via `router.push()`
- **Module cards** — Show Lucide icon, name, field count, record count, status badge; "Open" navigates to `/studio/modules/[slug]`; "···" dropdown via `<DropdownMenu>`: Edit, Duplicate, Export JSON, Deactivate, Delete (with confirmation `<AlertDialog>`)
- **Dashboard cards** — Click navigates to `/studio/dashboards/[id]`
- **Workflow rows** — `<Switch>` toggle for active/inactive, click to navigate to `/studio/workflows/[id]`
- **[+ New Module]** — Navigates to `/studio/modules/new`
- **Search** — Client-side filter with debounced `<Input>`

### Task 4.2: Studio Layout with Sub-navigation

**File:** `src/app/(dashboard)/studio/layout.tsx`

Studio sub-navigation tabs using shadcn `<Tabs>` or a custom nav bar:

```
┌──────────────────────────────────────────────────────┐
│  Overview │ Modules │ Dashboards │ Workflows │ Rules │
└──────────────────────────────────────────────────────┘
```

Implementation: Use `usePathname()` to determine active tab, render `<Link>` elements styled as tabs. The layout wraps all `/studio/*` child pages.

```tsx
// Pattern:
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tabs = [
    { name: 'Overview', href: '/studio' },
    { name: 'Modules', href: '/studio/modules' },
    { name: 'Dashboards', href: '/studio/dashboards' },
    { name: 'Workflows', href: '/studio/workflows' },
    { name: 'Automation', href: '/studio/automation' },
  ];
  return (
    <div className="p-6 space-y-6">
      <nav className="flex gap-1 border-b">
        {tabs.map(tab => (
          <Link key={tab.href} href={tab.href}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px',
              isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            )}>
            {tab.name}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
```

---

## Phase 5: Frontend — Module Builder

### Task 5.1: Module List Page

**File:** `src/app/(dashboard)/studio/modules/page.tsx`

Full data table of all custom modules with:
- **Columns:** Name (with Lucide icon), Description, Fields count, Records count, Status badge, Created date, Actions dropdown
- **Toolbar:** Search `<Input>`, Status filter `<Select>` (All/Active/Inactive), [+ New Module] `<Button>`
- **Row actions:** Open, Edit Schema, View Records, Duplicate, Export JSON, Delete
- **Empty state:** Illustrated empty state with icon + "Create your first module" CTA
- **Data fetching:** `useQuery(['studio-modules'], fetchModules)`

### Task 5.2: Module Creator Page

**File:** `src/app/(dashboard)/studio/modules/new/page.tsx`

**Step-by-step wizard using React state (not a router-based wizard):**

**Step 1: Module Basics**
- Module Name (`<Input>` required, with auto-slug preview)
- Description (`<Textarea>` optional)
- Icon (`<ModuleIconPicker>` — Lucide icon browser)

**Step 2: Define Fields — Interactive field builder:**
- Drag-to-reorder field cards (use `framer-motion` `<Reorder.Group>`)
- Each field card: name (auto-generated snake_case from label), label, type `<Select>`, required `<Switch>`, options (for select/multiselect), placeholder, help text
- [+ Add Field] button at bottom
- **Field types available (14 types):**

| Type | Icon | Config Options |
|------|------|---------------|
| `text` | Aa | placeholder, maxLength, pattern |
| `textarea` | ¶ | placeholder, maxLength, rows |
| `number` | # | min, max, step, prefix, suffix |
| `currency` | $ | currency code, decimals |
| `date` | 📅 | minDate, maxDate, includeTime |
| `boolean` | ✓ | labelWhenTrue, labelWhenFalse |
| `select` | ▼ | options[], defaultValue |
| `multiselect` | ☑ | options[], maxSelections |
| `email` | @ | — |
| `phone` | 📞 | countryCode |
| `url` | 🔗 | — |
| `file` | 📎 | accept, maxSize |
| `json` | {} | schema |
| `lookup` | 🔍 | targetModule, displayField |

**Step 3: Configure Views** — Checkboxes for which views to auto-generate (List ✓, Form ✓, Kanban ○, Calendar ○). Each with brief settings (e.g., Kanban: which field is the group-by column).

**Step 4: Review & Create** — Summary card showing module name, icon, field count, and field preview table. "Create Module" button calls POST `/api/studio/modules`. On success, redirect to `/studio/modules/[slug]`.

### Task 5.3: Module Detail / Schema Editor

**File:** `src/app/(dashboard)/studio/modules/[slug]/page.tsx`

**Sub-tabs** (rendered within the page, not separate routes):
- **Records** — `<RecordTable>` (see Phase 6)
- **Schema** — Field editor: add/remove/reorder fields with drag-drop, save changes
- **Settings** — Module name, icon, description, active toggle `<Switch>`, danger zone (delete module with `<AlertDialog>` confirmation)
- **Import/Export** — CSV/JSON import form + export buttons

**Data fetching:** `useQuery(['studio-module', slug], () => fetchModuleBySlug(slug))`

### Task 5.4: Module Editor Components

**Files:**
- Create: `src/components/studio/ModuleFieldEditor.tsx` — Drag-drop field builder using `framer-motion` Reorder. Lists all fields, allows add/remove/reorder.
- Create: `src/components/studio/FieldTypeSelector.tsx` — Visual grid of 14 field types with icons and descriptions. Used in field creation.
- Create: `src/components/studio/FieldConfigPanel.tsx` — Contextual settings panel that changes based on field type (shows min/max for number, options for select, etc.)
- Create: `src/components/studio/ModuleIconPicker.tsx` — Searchable Lucide icon gallery. Uses `lucide-react` icon names. Renders a grid of icons in a `<Popover>`.

---

## Phase 6: Frontend — Dynamic Record Manager

### Task 6.1: Record List (Data Table)

**File:** Rendered within `src/app/(dashboard)/studio/modules/[slug]/page.tsx` Records tab

**Components:**
- Create: `src/components/studio/RecordTable.tsx` — Dynamic table auto-generated from module fields. Uses shadcn `<Table>`. Columns derived from `CustomModuleField[]`.
- Create: `src/components/studio/RecordFilters.tsx` — Dynamic filter builder: pick field → pick operator (equals, contains, gt, lt, between) → enter value. Filter definitions adapt to field type.
- Create: `src/components/studio/RecordSearch.tsx` — Debounced search input, searches across all `text` and `textarea` fields via API query param.

**Features:**
- Column sorting (click header, sends `sortBy` + `sortOrder` to API)
- Row selection with `<Checkbox>` (bulk actions toolbar appears when > 0 selected)
- Click row → opens record detail `<Dialog>` with `<DynamicForm>`
- Pagination with configurable page size `<Select>` (10/25/50/100)
- Empty state with "Add your first record" CTA

### Task 6.2: Dynamic Record Form

**Components:**
- Create: `src/components/studio/DynamicForm.tsx` — Auto-generates form fields from `CustomModuleField[]` using `react-hook-form` + `zod` dynamic schema.
- Create: `src/components/studio/DynamicFormField.tsx` — Renders the correct shadcn input for each field type:

| Field Type | Rendered As |
|------------|-------------|
| `text` | `<Input>` |
| `textarea` | `<Textarea>` |
| `number` | `<Input type="number">` |
| `currency` | `<Input>` with `<Select>` currency prefix |
| `date` | `<Popover>` + shadcn `<Calendar>` |
| `boolean` | `<Switch>` |
| `select` | `<Select>` |
| `multiselect` | Multiple `<Checkbox>` group in a `<div>` |
| `email` | `<Input type="email">` |
| `phone` | `<Input type="tel">` |
| `url` | `<Input type="url">` |
| `file` | `<Input type="file">` (basic) or custom dropzone |
| `json` | `<Textarea>` with JSON validation |
| `lookup` | Searchable `<Select>` fetching from target module via `/api/studio/modules/[targetSlug]/records?search=` |

**Form is used in two contexts:**
1. **Dialog** — For quick create/edit from the record table (using shadcn `<Dialog>`)
2. **Full page** — `src/app/(dashboard)/studio/modules/[slug]/records/[recordId]/page.tsx`

**Validation:** Build a Zod schema dynamically from `CustomModuleField[]`:
```typescript
function buildZodSchema(fields: CustomModuleField[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    let schema: z.ZodTypeAny;
    switch (field.type) {
      case 'text': schema = z.string(); break;
      case 'number': schema = z.number(); break;
      case 'email': schema = z.string().email(); break;
      case 'url': schema = z.string().url(); break;
      // ... etc
    }
    if (!field.required) schema = schema.optional();
    shape[field.name] = schema;
  }
  return z.object(shape);
}
```

### Task 6.3: Record Detail Page

**File:** `src/app/(dashboard)/studio/modules/[slug]/records/[recordId]/page.tsx`

Full record view:
- Field-by-field display using `<DynamicForm>` in read mode (or toggle to edit mode)
- Header: record title (first text field value or record ID), edit/delete buttons
- Metadata footer: created at, updated at, created by
- Breadcrumb: Studio → Modules → [Module Name] → Records → [Record ID]

---

## Phase 7: Frontend — Dashboard Engine

### Task 7.1: Dashboard List Page

**File:** `src/app/(dashboard)/studio/dashboards/page.tsx`

Grid of dashboard cards:
- Card shows: name, description, icon, widget count, default badge, published status
- Actions: Open, Edit, Duplicate, Delete
- [+ New Dashboard] button
- Empty state

### Task 7.2: Dashboard Builder Page

**File:** `src/app/(dashboard)/studio/dashboards/new/page.tsx`
**File:** `src/app/(dashboard)/studio/dashboards/[id]/edit/page.tsx`

**Layout:**

```
┌────────────────────────────────────────────────────────────┐
│  Dashboard Builder                    [Preview] [Save]      │
│                                                            │
│  Name: [Executive Overview     ]                           │
│                                                            │
│  ┌── Widget Palette ──┐ ┌── Canvas ────────────────────┐   │
│  │                    │ │                               │   │
│  │  📊 Chart          │ │  [Widgets arranged in grid]   │   │
│  │  📈 Metric         │ │                               │   │
│  │  📋 Table          │ │                               │   │
│  │  📝 List           │ │                               │   │
│  │  📅 Calendar       │ │                               │   │
│  │                    │ │                               │   │
│  │  ─── Data Source ─ │ │                               │   │
│  │  ▼ Custom Modules  │ │                               │   │
│  │  ▼ ERP Data       │ │                               │   │
│  └────────────────────┘ └───────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Implementation approach:**
- Canvas uses CSS Grid layout (not ReactFlow — that's for workflows only)
- Widget palette: clickable list that adds a new widget to the canvas with default position
- Click widget on canvas → opens `<Sheet>` (side panel) with config form:
  - Title `<Input>`
  - Widget type `<Select>` (metric/chart/table/list/calendar)
  - Data source `<Select>` (populated from `/api/studio/data-sources`)
  - Type-specific config (chart type for charts, columns for tables, etc.)
  - Date range `<Select>` (last 7d/30d/90d/year/all-time)
  - Refresh interval `<Select>`
- Widget positioning: simple grid positions (x, y, w, h) stored in layout JSON. Drag to move within grid. Resize with corner handles.
- **Preview mode:** Toggles between edit mode (shows handles, config) and view mode (shows live data)
- Save: POST/PUT dashboard with all widgets and layout to API

**Data source discovery:** On mount, fetch `/api/studio/data-sources` to get all available connectors. Categorize into "Custom Modules" and "ERP Data" sections in the palette.

### Task 7.3: Dashboard View Page

**File:** `src/app/(dashboard)/studio/dashboards/[id]/page.tsx`

Read-only rendered dashboard with:
- Each widget rendered by the appropriate renderer component
- Auto-refresh based on widget `refreshInterval` setting (via `useQuery` refetchInterval)
- Global date range selector (overrides individual widget date ranges)
- Full-screen mode per widget (via `<Dialog>` fullscreen)
- Export widget data as CSV (via `papaparse`)

### Task 7.4: Widget Renderer Components

**Files:**
- Create: `src/components/studio/widgets/MetricWidget.tsx` — Large number + trend arrow (up/down) + percentage change. Uses `<Card>` layout. Data from `count()` or single `aggregate()`.
- Create: `src/components/studio/widgets/ChartWidget.tsx` — Recharts-based. Supports `<LineChart>`, `<BarChart>`, `<PieChart>`, `<AreaChart>`. Data from `timeSeries()` or `aggregate(groupBy)`.
- Create: `src/components/studio/widgets/TableWidget.tsx` — Mini data table with configurable columns. Data from `list(limit)`. Uses shadcn `<Table>`.
- Create: `src/components/studio/widgets/ListWidget.tsx` — Ordered list of items with label + value. Good for top-N lists. Data from `aggregate(groupBy, limit)`.
- Create: `src/components/studio/widgets/CalendarWidget.tsx` — Date-based event/record view. Uses shadcn `<Calendar>` with dot indicators. Data from `list()` filtered by date field.
- Create: `src/components/studio/widgets/WidgetWrapper.tsx` — Common frame: card with title bar, overflow menu (fullscreen, export, edit, delete), loading skeleton, error boundary fallback.

---

## Phase 8: Frontend — Workflow Designer

### Task 8.1: Workflow List Page

**File:** `src/app/(dashboard)/studio/workflows/page.tsx`

Table/cards of workflows:
- Columns: Name, Trigger Type badge, Status (Active/Inactive `<Switch>`), Last Run date, Execution Count, Actions
- [+ New Workflow] button
- Empty state

### Task 8.2: Workflow Designer Page

**File:** `src/app/(dashboard)/studio/workflows/new/page.tsx`
**File:** `src/app/(dashboard)/studio/workflows/[id]/page.tsx`

**ReactFlow-based visual editor** (using `react-flow-renderer` v10 API, NOT `@xyflow/react`):

```
┌────────────────────────────────────────────────────────────┐
│  Workflow: Welcome Email Flow           [Test] [Save]       │
│                                                            │
│  ┌── Node Palette ──┐ ┌── Canvas ──────────────────────┐   │
│  │                  │ │                                 │   │
│  │  ⚡ Triggers     │ │  [ReactFlow canvas with nodes]  │   │
│  │   • On Create    │ │                                 │   │
│  │   • On Update    │ │                                 │   │
│  │   • On Delete    │ │                                 │   │
│  │   • Scheduled    │ │                                 │   │
│  │   • Webhook      │ │                                 │   │
│  │   • Manual       │ │                                 │   │
│  │                  │ │                                 │   │
│  │  🔀 Logic        │ │                                 │   │
│  │   • If/Else      │ │                                 │   │
│  │   • Switch       │ │                                 │   │
│  │   • Delay        │ │                                 │   │
│  │   • Loop         │ │                                 │   │
│  │                  │ │                                 │   │
│  │  ▶ Actions       │ │                                 │   │
│  │   • Send Email   │ │                                 │   │
│  │   • Send SMS     │ │                                 │   │
│  │   • Create Task  │ │                                 │   │
│  │   • Update Field │ │                                 │   │
│  │   • Webhook      │ │                                 │   │
│  │   • Notification │ │                                 │   │
│  │   • Create Rec.  │ │                                 │   │
│  │   • Delete Rec.  │ │                                 │   │
│  └──────────────────┘ └─────────────────────────────────┘   │
│                                                            │
│  ┌── Node Config (shown when node selected) ────────────┐   │
│  │  📧 Send Email                                        │   │
│  │  To: {{record.customer_email}}                        │   │
│  │  Subject: New claim received                           │   │
│  │  Body: [Textarea with template variable support]       │   │
│  └───────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Adding nodes:** Click node type in palette → node appears on canvas at center. Drag to position. Connect by dragging from output handle to input handle.

**Node selection:** Click node on canvas → config panel appears below (or in a `<Sheet>` side panel). Config form adapts to node type.

**Custom ReactFlow node types:**
- Create: `src/components/studio/workflow/TriggerNode.tsx` — Yellow/amber colored, lightning icon, shows trigger type
- Create: `src/components/studio/workflow/ConditionNode.tsx` — Blue colored, diamond shape or branch icon, shows condition summary, has two output handles (true/false)
- Create: `src/components/studio/workflow/ActionNode.tsx` — Green colored, play icon, shows action type and key config
- Create: `src/components/studio/workflow/DelayNode.tsx` — Gray colored, clock icon, shows delay duration
- Create: `src/components/studio/workflow/NodeConfigPanel.tsx` — Dynamic config form based on selected node type

**ReactFlow setup:**
```tsx
import ReactFlow, { Controls, Background, MiniMap } from 'react-flow-renderer';

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
};

// Use useNodesState and useEdgesState from react-flow-renderer
```

**Save:** Serialize `nodes` and `edges` arrays to JSON, POST/PUT to `/api/studio/workflows/[id]`.

**Test:** "Test" button opens a `<Dialog>` where user provides sample trigger data (JSON textarea), then calls `/api/studio/workflows/[id]/execute` and shows live step-by-step execution progress.

### Task 8.3: Workflow Execution History

**File:** `src/app/(dashboard)/studio/workflows/[id]/executions/page.tsx`

Table of past executions:
- Columns: Started At, Duration (completedAt - startedAt), Status badge (running/completed/failed/cancelled), Trigger summary
- Click row → expands to show step-by-step detail: each node executed, its status, output, timing
- Filters: status, date range

---

## Phase 9: Frontend — Automation Rules (Enhanced)

### Task 9.1: Automation Rules Page

**File:** `src/app/(dashboard)/studio/automation/page.tsx`

This replaces the current `/automation` page by hosting it under Studio's sub-navigation. The existing `/automation` page should redirect to `/studio/automation`.

List view:
- Cards/rows of rules with: name, description, trigger type badge, active status `<Switch>`, execution count, last run date
- [+ New Rule] button → `/studio/automation/new`
- Empty state

**Fix existing bug:** The current automation page calls `PATCH /api/automation/rules/${ruleId}` to toggle rules, but no `[ruleId]` route exists. Task 3.5 creates this route.

### Task 9.2: Rule Builder

**File:** `src/app/(dashboard)/studio/automation/new/page.tsx`
**File:** `src/app/(dashboard)/studio/automation/[id]/page.tsx`

Enhanced version of existing `AutomationRuleBuilder.tsx` (210 lines in `src/components/automation/`):
- Reuse/extend the existing component (don't rewrite from scratch)
- Add: Module-aware trigger selection — pick which custom module triggers the rule (shows `<Select>` of all custom modules)
- Add: Condition builder with field-aware operators — when a module is selected, show its fields in condition dropdowns
- Add: Action configurators with template variables — show `{{record.field_name}}` autocomplete
- Add: Test/dry-run button — executes rule with sample data and shows results

### Task 9.3: Automation Redirect (NEW)

**File:** `src/app/(dashboard)/automation/page.tsx`

Replace the existing 95-line page with a redirect:
```tsx
import { redirect } from 'next/navigation';
export default function AutomationPage() {
  redirect('/studio/automation');
}
```

---

## Phase 10: Sidebar Navigation Update

### Task 10.1: Expand Studio Sidebar

**File:** Modify `src/components/layout/Sidebar.tsx`

The sidebar already supports `children[]` arrays for expandable sub-menus (with framer-motion animation). Replace the single "No-Code Studio" entry and "Automation Rules" entry with:

```typescript
{
  name: 'No-Code Studio',
  href: '/studio',
  icon: Palette,
  moduleId: 'studio',
  children: [
    { name: 'Overview', href: '/studio', icon: LayoutDashboard, moduleId: 'studio' },
    { name: 'Modules', href: '/studio/modules', icon: Database, moduleId: 'studio' },
    { name: 'Dashboards', href: '/studio/dashboards', icon: Layout, moduleId: 'studio' },
    { name: 'Workflows', href: '/studio/workflows', icon: Workflow, moduleId: 'studio' },
    { name: 'Automation', href: '/studio/automation', icon: Zap, moduleId: 'studio' },
  ],
},
```

Remove the separate "Automation Rules" entry (`{ name: 'Automation Rules', href: '/automation', icon: Zap, moduleId: 'automation' }`) since automation is now consolidated under Studio.

**Also update `src/lib/modules.ts`:** Merge the `automation` module into `studio` or add a note that automation is accessed via Studio. Ensure users with `studio` permissions can access automation features.

---

## Phase 11: Integration & Polish (NEW — Missing from Original Plan)

### Task 11.1: React Query Provider & Hooks

**File:** Create `src/hooks/use-studio.ts`

Custom hooks wrapping `@tanstack/react-query` for all Studio data fetching:

```typescript
export function useCustomModules(filters?) { return useQuery(...) }
export function useCustomModule(slug) { return useQuery(...) }
export function useCustomRecords(moduleId, filters?) { return useQuery(...) }
export function useDashboards() { return useQuery(...) }
export function useDashboard(id) { return useQuery(...) }
export function useWorkflows() { return useQuery(...) }
export function useWorkflow(id) { return useQuery(...) }
export function useDataSources() { return useQuery(...) }

// Mutations
export function useCreateModule() { return useMutation(...) }
export function useUpdateModule() { return useMutation(...) }
export function useDeleteModule() { return useMutation(...) }
export function useCreateRecord() { return useMutation(...) }
// ... etc
```

This centralizes all API calls and provides consistent loading/error states across all Studio pages.

### Task 11.2: Error Boundaries (NEW)

**File:** Create `src/components/studio/StudioErrorBoundary.tsx`

React error boundary component for Studio pages. Catches rendering errors in dynamic components (especially important since we're rendering user-defined schemas). Shows a friendly error message with "Try again" button instead of crashing the whole app.

### Task 11.3: Loading Skeletons (NEW)

**File:** Create `src/components/studio/StudioSkeleton.tsx`

Reusable skeleton components matching Studio layouts:
- `ModuleCardSkeleton` — For module grid loading state
- `RecordTableSkeleton` — For record table loading state
- `DashboardSkeleton` — For dashboard view loading state
- `WorkflowSkeleton` — For workflow designer loading state

Uses shadcn `<Skeleton>` component.

### Task 11.4: Breadcrumb Navigation (NEW)

**File:** Create `src/components/studio/StudioBreadcrumb.tsx`

Dynamic breadcrumb that adapts to current route:
- Studio → Overview
- Studio → Modules → [Module Name]
- Studio → Modules → [Module Name] → Records → [Record ID]
- Studio → Dashboards → [Dashboard Name] → Edit
- Studio → Workflows → [Workflow Name]

Uses `usePathname()` + data from parent layout/page.

---

## Verification Plan

### Automated Checks

```bash
# 1. Prisma schema validation
npx prisma validate

# 2. TypeScript compilation (strict mode)
npx tsc --noEmit

# 3. Next.js production build
pnpm build
```

### Manual Verification (Browser-based)

1. **Module CRUD:** `/studio/modules` → Create module with 5+ fields (mix of types) → Verify in list → Edit schema (add/remove/reorder fields) → Verify changes persist after refresh
2. **Record CRUD:** Navigate to created module → Add 3 records via dialog form → Verify table displays with correct columns → Edit a record → Delete a record → Test bulk delete with checkboxes → Test search/filter
3. **Record Validation:** Try submitting a record with missing required fields → Verify error messages. Try invalid email/URL → Verify format validation.
4. **CSV Import/Export:** Export records as CSV → Import them back into a different module with matching fields → Verify data integrity
5. **Dashboard Builder:** `/studio/dashboards` → Create dashboard → Add metric widget (total invoices from `erp:accounting.invoices`) → Add chart widget (revenue by month) → Add table widget (recent records from custom module) → Save → View renders live data
6. **Workflow Designer:** `/studio/workflows` → Create workflow → Add trigger (On Record Created) + condition (Amount > 500) + action (Send Notification) → Save → Verify loads back correctly → Test execute with sample data
7. **Automation:** `/studio/automation` → Create rule → Toggle active/inactive → Verify `/automation` redirects to `/studio/automation`
8. **Cross-module data:** Dashboard widget pulling from `erp:accounting.invoices` with real data → Widget pulling from `erp:hr.employees` → Widget pulling from custom module records
9. **Sidebar:** Verify Studio expands to show sub-items → Click each sub-item → Verify correct page loads → Verify old Automation menu item is removed
10. **Permissions:** Log in as non-admin user without `studio` module permission → Verify Studio is hidden from sidebar and routes return 403

---

## File Summary

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Dependencies | — | 1 (`package.json` via pnpm add) |
| Prisma Schema | — | 1 (`prisma/schema.prisma`) |
| Business Logic | 8 | — |
| Custom Hooks | 1 | — |
| API Routes | ~25 | 2 (existing modules + dashboards routes) |
| Pages | ~18 | 1 (`automation/page.tsx` redirect) |
| Components | ~23 | 1 (`Sidebar.tsx`) |
| Module Config | — | 1 (`src/lib/modules.ts`) |
| **Total** | **~75** | **~7** |

### New File Inventory

**Business Logic (8):**
1. `src/apps/studio/types.ts` (overwrite)
2. `src/apps/studio/api.ts` (overwrite)
3. `src/apps/studio/dashboard-api.ts`
4. `src/apps/studio/data-connectors.ts`
5. `src/apps/studio/workflow-api.ts`
6. `src/apps/studio/automation-api.ts`
7. `src/apps/studio/workflow-engine.ts`
8. `src/apps/studio/validation.ts`

**Hooks (1):**
9. `src/hooks/use-studio.ts`

**API Routes (~25):**
10. `src/app/api/studio/modules/route.ts` (modify existing)
11. `src/app/api/studio/modules/[id]/route.ts`
12. `src/app/api/studio/modules/[id]/fields/route.ts`
13. `src/app/api/studio/modules/[id]/fields/[fieldId]/route.ts`
14. `src/app/api/studio/modules/[id]/fields/reorder/route.ts`
15. `src/app/api/studio/modules/[id]/records/route.ts`
16. `src/app/api/studio/modules/[id]/records/[recordId]/route.ts`
17. `src/app/api/studio/modules/[id]/records/bulk-delete/route.ts`
18. `src/app/api/studio/modules/[id]/records/export/route.ts`
19. `src/app/api/studio/modules/[id]/records/import/route.ts`
20. `src/app/api/studio/dashboards/route.ts` (modify existing)
21. `src/app/api/studio/dashboards/[id]/route.ts`
22. `src/app/api/studio/dashboards/[id]/widgets/route.ts`
23. `src/app/api/studio/dashboards/[id]/widgets/[widgetId]/route.ts`
24. `src/app/api/studio/data-sources/route.ts`
25. `src/app/api/studio/data-sources/preview/route.ts`
26. `src/app/api/studio/workflows/route.ts`
27. `src/app/api/studio/workflows/[id]/route.ts`
28. `src/app/api/studio/workflows/[id]/execute/route.ts`
29. `src/app/api/studio/workflows/[id]/executions/route.ts`
30. `src/app/api/automation/rules/[ruleId]/route.ts`
31. `src/app/api/studio/automation/route.ts`
32. `src/app/api/studio/automation/[id]/route.ts`
33. `src/app/api/studio/automation/[id]/toggle/route.ts`
34. `src/app/api/studio/automation/[id]/executions/route.ts`

**Pages (~18):**
35. `src/app/(dashboard)/studio/page.tsx` (overwrite)
36. `src/app/(dashboard)/studio/layout.tsx`
37. `src/app/(dashboard)/studio/modules/page.tsx`
38. `src/app/(dashboard)/studio/modules/new/page.tsx`
39. `src/app/(dashboard)/studio/modules/[slug]/page.tsx`
40. `src/app/(dashboard)/studio/modules/[slug]/records/[recordId]/page.tsx`
41. `src/app/(dashboard)/studio/dashboards/page.tsx`
42. `src/app/(dashboard)/studio/dashboards/new/page.tsx`
43. `src/app/(dashboard)/studio/dashboards/[id]/page.tsx`
44. `src/app/(dashboard)/studio/dashboards/[id]/edit/page.tsx`
45. `src/app/(dashboard)/studio/workflows/page.tsx`
46. `src/app/(dashboard)/studio/workflows/new/page.tsx`
47. `src/app/(dashboard)/studio/workflows/[id]/page.tsx`
48. `src/app/(dashboard)/studio/workflows/[id]/executions/page.tsx`
49. `src/app/(dashboard)/studio/automation/page.tsx`
50. `src/app/(dashboard)/studio/automation/new/page.tsx`
51. `src/app/(dashboard)/studio/automation/[id]/page.tsx`
52. `src/app/(dashboard)/automation/page.tsx` (overwrite with redirect)

**Components (~23):**
53. `src/components/studio/ModuleFieldEditor.tsx`
54. `src/components/studio/FieldTypeSelector.tsx`
55. `src/components/studio/FieldConfigPanel.tsx`
56. `src/components/studio/ModuleIconPicker.tsx`
57. `src/components/studio/RecordTable.tsx`
58. `src/components/studio/RecordFilters.tsx`
59. `src/components/studio/RecordSearch.tsx`
60. `src/components/studio/DynamicForm.tsx`
61. `src/components/studio/DynamicFormField.tsx`
62. `src/components/studio/StudioErrorBoundary.tsx`
63. `src/components/studio/StudioSkeleton.tsx`
64. `src/components/studio/StudioBreadcrumb.tsx`
65. `src/components/studio/widgets/MetricWidget.tsx`
66. `src/components/studio/widgets/ChartWidget.tsx`
67. `src/components/studio/widgets/TableWidget.tsx`
68. `src/components/studio/widgets/ListWidget.tsx`
69. `src/components/studio/widgets/CalendarWidget.tsx`
70. `src/components/studio/widgets/WidgetWrapper.tsx`
71. `src/components/studio/workflow/TriggerNode.tsx`
72. `src/components/studio/workflow/ConditionNode.tsx`
73. `src/components/studio/workflow/ActionNode.tsx`
74. `src/components/studio/workflow/DelayNode.tsx`
75. `src/components/studio/workflow/NodeConfigPanel.tsx`

---

## Appendix: Review Changelog (Differences from Original Plan)

### Critical Fixes
1. **AutomationRule/AutomationExecution conflict resolved** — The original plan defined new `AutomationRule` and `AutomationExecution` models, but these already exist in the schema (line 2103) with enum types. Resolved by keeping existing models and enhancing them instead of creating duplicates.
2. **react-flow-renderer vs @xyflow/react** — The installed package is `react-flow-renderer` v10.3.17 (the old API). All code must use `import ReactFlow from 'react-flow-renderer'` not `@xyflow/react`. The original plan didn't specify this.
3. **Missing [ruleId] API route** — The existing automation page tries to PATCH `/api/automation/rules/${ruleId}` but no such route exists. Added Task 3.5 to create it, fixing an existing bug.
4. **Tenant isolation in API routes** — The original plan didn't specify the auth pattern. Added explicit pattern: use `getServerSession(authOptions)` + `session.user.tenantId` (or `getOrCreateDefaultTenant()` fallback). Always pass tenantId in business logic queries.

### Missing Components Added
5. **Task 0.1: Dependencies** — Added explicit dependency check. `papaparse` needed for CSV. Clarified `react-flow-renderer` version constraint.
6. **Task 2.7: Workflow Execution Engine** — Original plan had no execution engine. Workflows could be designed visually but never run. Added server-side engine with action executors and template variable resolution.
7. **Task 2.8: Record Validation Engine** — Original plan mentioned "create with validation" but had no validation implementation. Added Zod-based dynamic schema builder.
8. **Task 9.3: Automation Redirect** — Old `/automation` page needs to redirect to `/studio/automation` to avoid dead routes.
9. **Task 11.1: React Query Hooks** — Centralized data fetching hooks. Original plan had no data fetching strategy.
10. **Task 11.2: Error Boundaries** — Critical for dynamic schema rendering. User-defined field schemas could cause rendering errors.
11. **Task 11.3: Loading Skeletons** — Consistent loading UX across all Studio pages.
12. **Task 11.4: Breadcrumb Navigation** — Deep nesting (module → records → record detail) needs breadcrumbs for usability.

### Accuracy Corrections
13. **Existing types.ts** — Has 129 lines with 8 field types. Plan adds 6 more field types (email, phone, url, currency, textarea, lookup) = 14 total.
14. **Existing api.ts** — Has 32 lines of stubs. Plan correctly identifies this as "overwrite."
15. **Existing studio/page.tsx** — 1,076 lines (not 1,147 as stated in original). Monolith with all 3 tabs inline.
16. **Data connectors** — Expanded from original list. Added `erp:accounting.journal-entries`, `erp:crm.activities`, `erp:inventory.warehouses`, `erp:hotel.bookings`, `erp:pos.orders` based on actual API routes discovered in codebase.
17. **Module registration** — Studio module already registered in `src/lib/modules.ts` (id: 'studio', category: 'automation'). No new registration needed, but automation module consolidation should be handled.
18. **Error handling pattern** — Added use of existing `tryCatch`, `formatSuccessResponse`, `formatPaginatedResponse` from `src/lib/error-handler.ts` to match codebase conventions.
19. **File count** — Updated from ~60 new + 6 modified → ~75 new + ~7 modified (more accurate after accounting for all additions).
20. **Dashboard canvas** — Clarified: use CSS Grid for dashboard layout, NOT ReactFlow. ReactFlow is exclusively for workflow designer.
