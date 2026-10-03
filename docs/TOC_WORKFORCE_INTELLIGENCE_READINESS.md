# TOC Workforce Intelligence Readiness Blueprint

## What This Proposal Really Is

The team lead's idea is not just another dashboard. It is a proposal to evolve ERP.slict.lk from a system that records business activity into a system that detects organizational problems, explains likely root causes, and helps leaders test decisions before they make them.

In practical terms, this means adding an Organizational Intelligence layer on top of the current ERP modules:

- HR and attendance provide workforce structure and stress signals.
- Projects and tasks provide workload, ownership, deadlines, and execution signals.
- Sales, purchasing, inventory, and approvals provide bottleneck and dependency signals.
- TOC models such as Goal Trees, Current Reality Trees, and Future Reality Trees turn those signals into decision maps.
- AI should explain findings and recommend actions, but only after the underlying data is proven reliable.

The most important design principle is: do not let AI produce executive recommendations until the tenant's data passes a readiness gate.

## Why We Cannot Build The AI Layer First

The risk is not the AI model. The real risk is bad telemetry.

If attendance records are incomplete, task ownership is missing, departments have no managers, or approval trails do not capture who delayed what, then the system can confidently produce the wrong answer. For example:

- A forgotten clock-out can look like burnout.
- Unassigned tasks can hide workload concentration.
- Missing department managers can break dependency analysis.
- Legacy sales orders without user ownership cannot prove who caused an approval delay.
- A department with no task deadlines cannot support SLA or productivity scoring.

So the first production feature should be the Inspector: a Pre-Flight Data Compatibility Auditor.

## Current Repo Reality

The current schema already has useful foundations:

- `Tenant` for multi-tenant isolation.
- `Employee`, `Department`, `Attendance`, `LeaveRequest`, and `Timesheet` for HR signals.
- `Project` and `Task` for workload signals.
- `SalesOrder`, `SalesOrderV2`, and `SalesOrderApproval` for operational approval signals.
- `User.employeeId` for linking ERP users to HR employees.
- `tenantId` indexes across most transactional models.

But it is not yet fully decision-intelligence-ready.

Current gaps:

- `Employee` has no direct `managerId`; hierarchy is only partially available through `Department.managerId`.
- `Attendance` has no stored `hoursWorked`, so duration must be computed from `checkIn` and `checkOut`.
- Legacy `SalesOrder` has limited audit ownership compared with `SalesOrderV2`.
- Tasks use `assigneeId`, but the schema does not enforce whether that ID maps to `User` or `Employee`.
- There is no central event/audit ledger for cross-module process mining.
- There are no persistent TOC models yet, such as `TocConstraint`, `TocTree`, or `TocNode`.
- There are no versioned score snapshots for Workforce DNA calculations.

## What We Should Build First

### Phase 0: Data Readiness Inspector

Build and use the auditor before adding TOC tables or AI recommendations.

The auditor should calculate a Data Readiness Index (DRI) from four domains:

| Domain | What It Checks | Why It Matters |
| --- | --- | --- |
| HR structure | Active employees, department assignment, ERP user linkage, department managers | Needed for hierarchy, dependency, and succession analysis |
| Attendance telemetry | Orphaned clock-ins, impossible durations, 16-hour cap violations | Needed for stress-load and burnout signals |
| Task telemetry | Assigned tasks, due dates, completion timestamps | Needed for productivity and overload scoring |
| Operational trails | SalesOrderV2 creator ownership and approval decision trails | Needed for bottleneck and constraint detection |

Activation rule:

- DRI >= 80: TOC intelligence can be enabled with confidence warnings.
- DRI < 80: block AI recommendations and show a data cleanup checklist.

This protects the product from "garbage in, garbage out."

## What Must Change In The Product

### 1. Add Stronger Organization Structure

Recommended schema changes:

- Add `Employee.managerId String?` as a self-relation.
- Add `Employee.userId String?` or keep the current `User.employeeId`, but standardize all task/approval ownership around one identity mapping.
- Add department hierarchy if needed: `Department.parentId`.

Why:

TOC analysis needs to know reporting lines and escalation paths. Department managers alone are not enough for real dependency mapping.

### 2. Standardize Action Ownership

Every operational action that may become part of a bottleneck analysis needs:

- `createdByUserId`
- `updatedByUserId` where relevant
- `approvedByUserId` or `decidedByUserId`
- `createdAt`
- `updatedAt`
- `decidedAt` or completed timestamp

Priority models:

- `SalesOrderV2`
- `PurchaseOrder`
- `Task`
- `StockMovement`
- `LeaveRequest`
- Studio workflow executions

### 3. Create A Central Operational Event Ledger

Add a model such as `OperationalEvent`:

```prisma
model OperationalEvent {
  id            String   @id @default(cuid())
  tenantId      String
  moduleKey     String
  entityType    String
  entityId      String
  action        String
  actorUserId   String?
  employeeId    String?
  occurredAt    DateTime @default(now())
  durationMs    Int?
  metadata      Json?

  @@index([tenantId, moduleKey])
  @@index([tenantId, entityType, entityId])
  @@index([tenantId, actorUserId])
  @@index([tenantId, occurredAt])
}
```

Why:

This becomes the clean input layer for process mining. Without this, every intelligence calculation has to guess from scattered module-specific fields.

### 4. Add Persistent Workforce Score Snapshots

Do not calculate employee intelligence live on every dashboard load.

Add models later:

- `EmployeeCapacitySnapshot`
- `TocConstraint`
- `TocTree`
- `TocNode`
- `ScenarioSimulation`

Each score must store:

- inputs used
- formula version
- confidence score
- generatedAt timestamp
- explanation metadata

This makes recommendations auditable.

## Accuracy Framework

This system should not output a single score without a confidence level.

Each insight should have:

- Data completeness score
- Signal freshness score
- Anomaly count
- Formula version
- Explanation path
- Human review status

Example:

```json
{
  "finding": "Finance team stress load is high",
  "score": 84,
  "confidence": 71,
  "blocked": false,
  "reasons": [
    "12 overdue tasks assigned to 2 users",
    "18 percent attendance anomaly rate was excluded",
    "3 approval records are pending over SLA"
  ],
  "limits": [
    "2 employees are not linked to ERP users",
    "Task completion timestamps are incomplete"
  ]
}
```

This is how we avoid pretending the system knows more than the data supports.

## Testing Strategy

### 1. Unit Tests

Test all scoring formulas with fixed input data.

Required cases:

- Perfect HR structure scores high.
- Missing departments lower HR score.
- Orphaned attendance lowers attendance score.
- Attendance over 16 hours is treated as an anomaly.
- Tasks without due dates lower task score.
- SalesOrderV2 approvals with full decision trails score higher than legacy orders.

### 2. Seeded Integration Tests

Create test tenants:

- `tenant_clean`: complete data, expected DRI above 90.
- `tenant_messy`: missing managers, orphaned attendance, unassigned tasks, expected DRI below 60.
- `tenant_partial`: acceptable onboarding data, expected DRI around 75-85.

These tests should run against a test database, not production.

### 3. Backtesting

Use historical data to ask:

- Did the engine detect known bottlenecks before they were manually discovered?
- Did high stress scores correlate with overtime, leave, missed deadlines, or turnover?
- Did predicted approval delays match actual approval delays?

If backtesting fails, the formula is not production-ready.

### 4. Chaos Testing

Inject controlled bad data into a test tenant:

- 72-hour attendance session.
- 100 unassigned tasks.
- Approval records without `decidedAt`.
- Employee removed from department.
- Sales spike without additional staff capacity.

Expected behavior:

- The system flags data quality issues.
- The system lowers confidence.
- The system does not produce high-confidence executive recommendations from bad data.

### 5. Human Validation

Before enabling recommendations:

- HR validates employee hierarchy.
- Operations validates approval process paths.
- Finance or management validates decision thresholds.
- Team lead approves formula versions.

The system should support "reviewed", "accepted", and "rejected" statuses for major findings.

## Scalability Strategy

Start with PostgreSQL. Do not introduce Neo4j yet.

PostgreSQL is enough for the first version because:

- Current ERP data already lives there.
- Multi-tenant isolation is already modeled with `tenantId`.
- Recursive CTEs can handle TOC trees.
- JSONB can store formula inputs and explanation metadata.
- Adding another database increases deployment, backup, security, and synchronization complexity.

Scale rules:

- Use indexed `tenantId` filters on every intelligence query.
- Snapshot scores nightly instead of recomputing everything on dashboard load.
- Recompute only affected employees/processes after important events.
- Store formula versions so old scores remain explainable.
- Keep AI explanation separate from deterministic scoring.

## Recommended Delivery Roadmap

### Step 1: Make The Inspector Real

Status: implemented in `scripts/data-compatibility-auditor.ts` and `scripts/run-preflight-audit.ts`.

Next actions:

- Run it against the current development database.
- Record the first DRI score.
- Use warnings to decide which schema/data gaps matter most.

Command:

```powershell
pnpm intelligence:audit
pnpm intelligence:audit tenant-clean
```

### Step 1.5: Seed Calibration Tenants

Status: implemented in `scripts/seed-intelligence-test.ts`.

The calibration harness creates three sandbox tenants:

| Tenant | Purpose | Expected Result |
| --- | --- | --- |
| `tenant-clean` | Complete HR hierarchy, clean attendance, assigned tasks, completed approval trails | Pass, high DRI |
| `tenant-messy` | Missing hierarchy, missing departments, 48-hour attendance anomalies, unassigned tasks, incomplete approvals | Blocked, low DRI |
| `tenant-marginal` | Mostly clean HR, one attendance anomaly, partial task deadlines, partial approval decisions | Borderline warning/pass range |

Command:

```powershell
pnpm intelligence:seed-test
pnpm intelligence:seed-test:write
pnpm intelligence:audit tenant-clean
pnpm intelligence:audit tenant-messy
pnpm intelligence:audit tenant-marginal
```

Prerequisite:

- Apply the `Employee.managerId` migration before running the seed script.

Safety behavior:

- `pnpm intelligence:seed-test` is dry-run only.
- `pnpm intelligence:seed-test:write` creates or resets only the three sandbox tenants.
- The seed script refuses to modify an existing tenant with the same subdomain unless that tenant has `settings.intelligenceTestHarness = true`.
- Data deletion is tenant-scoped and wrapped in a transaction.

### Step 2: Add A Data Readiness Dashboard

Create a page under HR, AI, or Admin that shows:

- DRI score
- domain scores
- warnings
- cleanup checklist
- blocked/pass state

Do not show TOC recommendations here yet.

### Step 3: Fix Identity And Hierarchy

Add direct manager relationships and standardize User-to-Employee ownership.

This is the biggest unlock for Workforce DNA.

### Step 4: Add Operational Event Ledger

Start logging high-value events from SalesOrderV2, PurchaseOrder, Task, Attendance, and Studio workflows.

This becomes the clean analytics input.

### Step 5: Build Workforce Capacity Snapshots

Create deterministic formulas first:

- stress load
- system dependency
- task completion reliability
- approval concentration
- succession coverage

Every formula must return a confidence score.

### Step 6: Add TOC Constraint Detection

Only after the data foundation is stable, add:

- `TocConstraint`
- `TocTree`
- `TocNode`
- constraint scanner jobs
- Current Reality Tree generation

### Step 7: Add AI Explanation

AI should explain and summarize deterministic findings. It should not invent scores.

Good AI role:

- "Here are the top three likely causes."
- "Here is why confidence is low."
- "Here are cleanup actions before trusting this."

Bad AI role:

- "Promote this employee" without audited evidence.
- "This person is a risk" without confidence and review.

## Final Recommendation

Build the Inspector first, then the event ledger, then workforce snapshots, then TOC trees, then AI explanations.

That order keeps the system scalable, testable, and commercially defensible. The product should become intelligent slowly and verifiably, not loudly and inaccurately.
