# ERP.slict.lk Organizational Decision Intelligence Transformation Plan

## Purpose

This plan transforms the team lead's TOC-Driven Workforce Intelligence proposal into a practical, phase-by-phase delivery roadmap for ERP.slict.lk.

The goal is not to rush into AI dashboards. The goal is to evolve the platform safely from a transactional ERP into an Organizational Decision Intelligence ERP that can detect constraints, explain root causes, measure workforce capacity, simulate future changes, and guide executives with confidence-scored recommendations.

## Final Target State

ERP.slict.lk will become a platform with two connected layers:

### 1. Existing Transactional ERP Layer

This remains the system of record.

- HRMS
- Attendance
- Payroll
- Inventory
- Procurement
- Finance
- POS
- CRM / Sales
- Projects
- Operations
- Studio workflows

### 2. New Organizational Intelligence Layer

This becomes the system of decision intelligence.

- Data Readiness Inspector
- Operational Event Ledger
- Workforce Capacity DNA
- Dependency Mapping
- Constraint Detection Engine
- Goal Tree Engine
- Current Reality Tree Engine
- Future Reality Simulator
- AI Recommendation Engine
- Executive Intelligence Dashboards

## Guiding Principle

The platform must never produce confident executive recommendations from weak data.

Every intelligence output must include:

- score
- confidence level
- data quality status
- explanation path
- affected source records
- recommended cleanup actions if confidence is low

AI should explain audited findings. AI should not invent scores.

## Current Foundation Already Completed

The first safety foundation has already started:

- Added `Employee.managerId` self-relation.
- Added guarded intelligence test tenants.
- Added pre-flight data compatibility auditor.
- Added dry-run-first seed harness.
- Added tenant-scoped sandbox write protection.
- Proved calibration tenants:
  - `tenant-clean`: 100.0% PASS
  - `tenant-messy`: 28.0% BLOCKED
  - `tenant-marginal`: 89.0% PASS, but needs score tuning

This proves the safety gate works and gives us a controlled testing framework.

## Final Product Workflow

### Step 1: Tenant Data Readiness Check

Before intelligence is enabled, the tenant runs the Data Readiness Inspector.

The system checks:

- employees
- managers
- departments
- attendance quality
- task assignment
- task deadlines
- sales order ownership
- approval decision trails

Output:

- Data Readiness Index
- pass / blocked status
- domain scores
- warnings
- cleanup checklist

If DRI is below the activation threshold, intelligence features remain locked.

### Step 2: Operational Events Are Captured

Every important business action creates a normalized event.

Examples:

- employee clocked in
- task assigned
- task completed
- sales order created
- approval requested
- approval delayed
- purchase order approved
- stock movement delayed
- workflow execution failed

These events feed the intelligence layer.

### Step 3: Workforce Capacity Scores Are Compiled

The system calculates Employee Capacity DNA snapshots.

Dimensions:

- Functional Capacity
- Leadership Capacity
- Cognitive Complexity
- System Dependency
- Productivity
- Stress Load
- Growth Potential
- Succession Readiness
- Adaptability

Each score includes confidence and formula version.

### Step 4: Constraints Are Detected

The system scans operational events, tasks, approvals, attendance, and department structure.

It detects:

- overloaded people
- approval bottlenecks
- missing backup roles
- departments with high dependency on one employee
- process delays
- operational hotspots
- recurring undesirable effects

### Step 5: TOC Trees Explain The Problem

The TOC layer converts raw signals into structured reasoning.

Goal Tree:

- What are we trying to achieve?
- What conditions must be true?

Current Reality Tree:

- What undesirable effects are happening?
- What is causing them?
- What is the likely root constraint?

Future Reality Tree:

- What happens if we change staffing, approvals, branches, or workload?
- What new risks could appear?

### Step 6: AI Explains And Recommends

AI receives deterministic findings and explains them in business language.

Good recommendation:

> Operations approval delays increased by 31% over 30 days. 74% of delayed approvals route through one manager. Confidence is 86%. Recommend delegating approvals below LKR 250,000 to the assistant manager.

Bad recommendation:

> Promote this employee because AI thinks so.

The system must avoid the second pattern.

## New User Experience

### New Main Navigation Area

Add a new dashboard module:

**Organizational Intelligence**

Suggested routes:

- `/intelligence`
- `/intelligence/readiness`
- `/intelligence/workforce`
- `/intelligence/constraints`
- `/intelligence/toc`
- `/intelligence/simulator`
- `/intelligence/recommendations`
- `/intelligence/settings`

### 1. Intelligence Home

Purpose:

Give executives a single page showing organizational health.

UI sections:

- Data Readiness Index
- Current primary constraint
- top workforce risks
- top process bottlenecks
- departments under pressure
- AI summary panel
- confidence warnings

Main cards:

- "Ready for TOC Analysis"
- "Current Constraint"
- "Workforce Stress"
- "Succession Risk"
- "Approval Bottlenecks"
- "Recommended Actions"

### 2. Data Readiness Page

Purpose:

Before AI, show whether the tenant data can support intelligence.

UI sections:

- global DRI score
- HR structure score
- attendance telemetry score
- task telemetry score
- operational trail score
- cleanup checklist
- "Run Audit" button
- tenant history of audit scores

Important behavior:

- If DRI is blocked, show cleanup actions instead of intelligence charts.
- If DRI passes with warnings, show confidence-limited access.

### 3. Workforce Intelligence Page

Purpose:

Show employee capacity and risk.

UI sections:

- employee capacity matrix
- department workload heatmap
- stress load trends
- dependency concentration
- succession readiness
- promotion readiness shortlist

Views:

- Table view
- Department heatmap
- Employee profile drawer
- Trend chart

Employee profile should show:

- Capacity DNA radar chart
- score explanations
- recent workload
- risk flags
- confidence level
- source data quality

### 4. Constraint Dashboard

Purpose:

Show the current operational constraint.

UI sections:

- primary constraint card
- top constraints list
- constraint type filter
- severity and confidence
- affected departments
- affected employees
- impact trend
- recommended exploitation/elevation actions

Constraint types:

- Human
- Process
- System
- Skill
- Decision
- Operational

### 5. TOC Tree Workspace

Purpose:

Visualize Goal Trees, CRTs, and FRTs.

UI sections:

- tree selector
- node canvas
- node details side panel
- source evidence panel
- confidence badge
- "convert to action" button

Tree types:

- Goal Tree
- Current Reality Tree
- Future Reality Tree

Implementation note:

Use the existing ReactFlow direction from Studio workflows where possible, so the product has one consistent visual workflow language.

### 6. Future Reality Simulator

Purpose:

Let executives test decisions before implementation.

Scenario examples:

- promote employee
- open new branch
- remove employee from role
- increase order volume
- delegate approvals
- add assistant manager
- reduce team size

UI sections:

- scenario builder
- adjustable assumptions
- affected departments
- predicted stress changes
- capacity gap analysis
- risk warnings
- before/after comparison

Every simulation result must show:

- confidence
- assumptions
- affected data
- impossible or low-confidence areas

### 7. AI Recommendations Page

Purpose:

Turn findings into readable executive actions.

UI sections:

- recommendations inbox
- priority
- confidence
- expected impact
- source evidence
- approval/reject workflow
- notes from management

Recommendation states:

- Draft
- Needs Review
- Accepted
- Rejected
- Implemented
- Archived

No recommendation should auto-execute business changes in early phases.

## Technical Architecture

### PostgreSQL First

Use PostgreSQL first. Do not add Neo4j in the early phases.

Why:

- Current data already lives in PostgreSQL.
- Multi-tenancy is already modeled with `tenantId`.
- Recursive CTEs can support TOC trees.
- JSONB can store explanation metadata and scoring inputs.
- One database is easier to secure, back up, operate, and sell.

### Microservice-Ready, Not Microservice-First

Build the intelligence engine as modular services inside the Next.js codebase first.

Suggested structure:

```text
src/lib/intelligence/
├── readiness/
├── events/
├── workforce/
├── constraints/
├── toc/
├── simulator/
├── recommendations/
└── scoring/
```

Later, heavy jobs can move into workers or services if needed.

### Background Jobs

Use scheduled jobs for:

- nightly readiness snapshots
- capacity score recalculation
- constraint scanning
- recommendation generation
- simulation history cleanup

Do not calculate everything live on dashboard load.

## Proposed Database Additions

### Phase 1 Required Models

```prisma
model DataReadinessAudit {
  id          String   @id @default(cuid())
  tenantId    String
  score       Float
  status      String
  domains     Json
  warnings    Json
  actionItems Json
  createdAt   DateTime @default(now())

  @@index([tenantId])
  @@index([createdAt])
}
```

```prisma
model OperationalEvent {
  id          String   @id @default(cuid())
  tenantId    String
  moduleKey   String
  entityType  String
  entityId    String
  action      String
  actorUserId String?
  employeeId  String?
  occurredAt  DateTime @default(now())
  durationMs  Int?
  metadata    Json?

  @@index([tenantId, moduleKey])
  @@index([tenantId, entityType, entityId])
  @@index([tenantId, actorUserId])
  @@index([tenantId, employeeId])
  @@index([tenantId, occurredAt])
}
```

```prisma
model EmployeeCapacitySnapshot {
  id                  String   @id @default(cuid())
  tenantId            String
  employeeId          String
  functionalCapacity  Float
  leadershipCapacity  Float
  cognitiveComplexity Float
  systemDependency    Float
  productivity        Float
  stressLoad          Float
  growthPotential     Float
  successionReadiness Float
  adaptability        Float
  category            String
  confidence          Float
  formulaVersion      String
  inputSummary        Json
  warnings            Json?
  createdAt           DateTime @default(now())

  @@index([tenantId])
  @@index([employeeId])
  @@index([tenantId, createdAt])
  @@index([tenantId, category])
}
```

### Phase 2 TOC Models

```prisma
model TocConstraint {
  id                 String   @id @default(cuid())
  tenantId           String
  type               String
  name               String
  description        String?
  severity           Float
  confidence         Float
  status             String
  linkedEmployeeId   String?
  linkedDepartmentId String?
  linkedProcessKey   String?
  evidence           Json?
  detectedAt         DateTime @default(now())
  resolvedAt         DateTime?

  @@index([tenantId])
  @@index([tenantId, type])
  @@index([tenantId, status])
}
```

```prisma
model TocTree {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  type        String
  description String?
  confidence  Float?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  nodes       TocNode[]

  @@index([tenantId])
  @@index([tenantId, type])
}
```

```prisma
model TocNode {
  id          String   @id @default(cuid())
  treeId      String
  parentId    String?
  label       String
  type        String
  probability Float?
  evidence    Json?
  metadata    Json?

  tree        TocTree  @relation(fields: [treeId], references: [id], onDelete: Cascade)
  parent      TocNode? @relation("TocNodeHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children    TocNode[] @relation("TocNodeHierarchy")

  @@index([treeId])
  @@index([parentId])
}
```

### Phase 3 Simulation Models

```prisma
model ScenarioSimulation {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  scenarioType String
  assumptions Json
  result      Json
  confidence  Float
  createdByUserId String?
  createdAt   DateTime @default(now())

  @@index([tenantId])
  @@index([tenantId, scenarioType])
  @@index([tenantId, createdAt])
}
```

### Phase 4 Recommendation Models

```prisma
model IntelligenceRecommendation {
  id          String   @id @default(cuid())
  tenantId    String
  title       String
  summary     String
  priority    String
  confidence  Float
  status      String
  sourceType  String?
  sourceId    String?
  evidence    Json?
  suggestedActions Json?
  createdAt   DateTime @default(now())
  reviewedByUserId String?
  reviewedAt  DateTime?

  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, priority])
}
```

## Phase-By-Phase Delivery Plan

## Phase 0: Safety And Calibration

Status: in progress.

Goal:

Prove that the platform can distinguish clean, messy, and marginal data before building intelligence features.

Already done:

- Pre-flight auditor
- safe seed harness
- `Employee.managerId`
- three calibration tenants

Remaining work:

- tune marginal scoring from `89%` closer to `78-83%`
- persist audit results in `DataReadinessAudit`
- expose audit through API
- build first Data Readiness UI

Exit criteria:

- clean tenant passes
- messy tenant blocks
- marginal tenant lands near gate
- no write script can delete real tenant data

## Phase 1: Workforce Intelligence Foundation

Goal:

Build the first decision-grade workforce intelligence layer.

Build:

- Data Readiness Dashboard
- Operational Event Ledger
- event emitters for HR, attendance, projects, sales approvals
- Employee Capacity Snapshot model
- deterministic scoring engine
- Workforce Intelligence page

First scores:

- stress load
- productivity
- system dependency
- succession readiness

Do not build:

- autonomous AI recommendations
- deep prediction
- auto-restructuring

Exit criteria:

- every score has confidence
- every score has source evidence
- executive dashboard shows workforce health without AI hallucination risk

## Phase 2: TOC Intelligence Layer

Goal:

Turn workforce and process signals into TOC explanations.

Build:

- Constraint Detection Engine
- `TocConstraint`
- Goal Tree workspace
- Current Reality Tree generator
- undesirable effect detection
- source evidence mapping

First detections:

- approval bottleneck
- overloaded manager
- missing backup employee
- high dependency concentration
- overdue task cluster
- attendance stress anomaly

Exit criteria:

- system identifies current primary constraint
- every constraint links to evidence
- CRT explains root cause chain
- users can review and mark findings as accepted/rejected

## Phase 3: Future Reality Simulator

Goal:

Let leaders test decisions safely before acting.

Build:

- scenario builder
- Future Reality Tree simulator
- before/after capacity calculations
- stress redistribution model
- branch expansion scenario
- promotion/removal scenario
- approval delegation scenario

Exit criteria:

- simulations show assumptions
- simulation confidence is visible
- results do not mutate operational data
- users can save and compare scenarios

## Phase 4: AI Recommendation Engine

Goal:

Use AI to explain findings and draft recommendations.

Build:

- recommendation inbox
- AI-generated explanations from deterministic evidence
- action plans
- management review workflow
- recommendation status tracking

Rules:

- AI cannot create scores.
- AI cannot hide low confidence.
- AI cannot auto-execute business changes.
- AI must cite source constraints, scores, or events.

Exit criteria:

- recommendations are evidence-backed
- executives can approve/reject
- low-confidence recommendations are clearly marked

## Phase 5: Autonomous Organizational Intelligence

Goal:

Long-term advanced automation.

Possible future capabilities:

- suggest staffing changes
- suggest approval delegation
- suggest succession plans
- detect organizational collapse points
- recommend branch expansion readiness
- trigger Studio workflows after approval

This phase should only begin after the previous phases are stable in real customer usage.

## New Business Workflow

### Current Workflow

1. Business runs operations.
2. ERP records transactions.
3. Managers manually inspect reports.
4. Problems are discovered late.
5. Decisions are made from incomplete context.

### New Workflow

1. Business runs operations.
2. ERP records transactions and operational events.
3. Inspector checks data quality.
4. Workforce engine calculates capacity.
5. Constraint engine detects bottlenecks.
6. TOC engine explains root causes.
7. Simulator tests possible actions.
8. AI summarizes recommendations.
9. Executives approve decisions.
10. Outcomes feed back into the intelligence layer.

## Example End-To-End Scenario

Problem:

Customer deliveries are repeatedly delayed.

System flow:

1. Operational events show sales orders stuck before fulfillment.
2. Approval records show 71% of delayed orders waited for one manager.
3. Attendance shows that manager has repeated overtime.
4. Tasks show no backup assignee for approval work.
5. Capacity snapshot shows high system dependency and stress load.
6. Constraint engine creates a Decision Constraint.
7. CRT shows:

```text
Late deliveries
  -> delayed fulfillment release
    -> approval queue blocked
      -> single manager dependency
        -> no delegated approval threshold
```

8. AI explains:

> The current constraint appears to be centralized approval. Confidence 87%. Delegating low-value approvals could reduce queue pressure without changing inventory operations.

9. Simulator tests:

- delegate approvals under LKR 250,000
- add assistant manager
- split approval by branch

10. Executive approves one action.

## Accuracy And Governance Rules

### Every Insight Needs Confidence

Confidence should be reduced by:

- missing employee hierarchy
- missing task deadlines
- orphaned attendance
- incomplete approval trails
- stale data
- small sample size
- conflicting signals

### Human Review Is Required

Before a recommendation becomes a business action, it should be reviewed by:

- HR for people-related changes
- Operations for process changes
- Finance for financial impact
- Executive user for final approval

### Auditability

Every generated insight must be traceable to:

- formula version
- source records
- source events
- generated timestamp
- user who reviewed it

## Security And Privacy

Workforce intelligence can be sensitive. Access must be role-gated.

Suggested permissions:

- `intelligence.readiness.view`
- `intelligence.workforce.view`
- `intelligence.workforce.sensitive`
- `intelligence.constraints.view`
- `intelligence.toc.manage`
- `intelligence.simulator.run`
- `intelligence.recommendations.review`
- `intelligence.admin`

Employee stress and promotion readiness should not be visible to normal users.

## Frontend UX Implementation Specification

This section defines the concrete UI expansion for the Organizational Intelligence module.

### Global Navigation

Add a new sidebar/navigation group:

**Organizational Intelligence**

Routes:

| Route | Screen Name | Purpose |
| --- | --- | --- |
| `/intelligence` | Executive Control Center | Executive summary and current organizational health |
| `/intelligence/readiness` | Data Gate & Verification | Data Readiness Index, audit execution, cleanup checklist |
| `/intelligence/workforce` | Workforce DNA Analytics | Capacity profiles, stress, dependency, succession readiness |
| `/intelligence/constraints` | Constraint Log | Active bottlenecks and management playbooks |
| `/intelligence/toc` | TOC Tree Workspace | Goal Tree, CRT, and FRT canvas |
| `/intelligence/simulator` | Decision Sandbox | Scenario testing and before/after simulation |
| `/intelligence/recommendations` | AI Advisory Inbox | Evidence-backed recommendations and governance |
| `/intelligence/settings` | Intelligence Settings | thresholds, formula versions, permissions, activation rules |

### Cross-Screen UX Rule: Conditional Disclosure

No prediction, chart, or recommendation should appear as clean truth unless it also shows:

- data freshness timestamp
- confidence score
- source evidence availability
- formula version where applicable
- warning state if inputs are incomplete

If DRI is below the activation threshold:

- `/intelligence/readiness` remains available.
- Other intelligence routes show a locked/blurred state.
- The user sees the cleanup checklist and missing data reasons.
- No AI recommendations are generated.

### Shared UI Components

Create reusable intelligence UI components:

```text
src/components/intelligence/
├── ConfidenceBadge.tsx
├── DataFreshnessStamp.tsx
├── EvidenceDrawer.tsx
├── IntelligenceGate.tsx
├── MetricDelta.tsx
├── ReadinessMeter.tsx
├── RiskBadge.tsx
├── ScoreCard.tsx
├── SeverityTracker.tsx
└── SourceRecordList.tsx
```

Component rules:

- `ConfidenceBadge` must appear beside every computed score.
- `DataFreshnessStamp` must appear on every chart group.
- `EvidenceDrawer` must show source records/events behind each insight.
- `IntelligenceGate` controls locked states when DRI is too low.
- `SeverityTracker` visualizes constraint impact without hiding confidence.

### 1. Executive Control Center (`/intelligence`)

Audience:

- CEO
- senior management
- operations leadership

Layout:

- top KPI row
- primary constraint panel
- department pressure heatmap
- recommendation summary strip
- navigation tiles into deeper dashboards

Hero KPIs:

- Data Readiness Index
- Primary Operational Constraint
- Workforce Stress Index
- Succession Risk Index
- Approval Delay Index

Primary cards:

- Workforce Stress
- Succession Risks
- Approval Bottlenecks
- Constraint Trend
- AI Summaries

Behavior:

- If DRI is blocked, show readiness gate instead of executive intelligence.
- If DRI passes with warnings, show all KPIs with warning badges.
- Clicking any KPI opens its evidence drawer or related page.

### 2. Data Gate & Verification (`/intelligence/readiness`)

Audience:

- admins
- implementation consultants
- executives validating readiness

Layout:

- large diagnostic meter
- four domain cards
- audit action row
- cleanup checklist
- audit history trend

Main UI:

- `ReadinessMeter`: 0-100 DRI arc or radial meter
- domain cards:
  - HR Directory Structure
  - Attendance Telemetry
  - Task Metrics
  - Operational Trails
- `Run Database Audit` button
- cleanup checklist generated from warnings/action items

States:

- `PASS`: unlock intelligence routes
- `PASS_WITH_WARNINGS`: unlock with visible confidence warnings
- `BLOCKED`: lock intelligence routes and prioritize cleanup

Required fields on screen:

- last audit timestamp
- audited tenant
- DRI threshold
- domain score breakdown
- warning count
- cleanup item count

### 3. Workforce DNA Analytics (`/intelligence/workforce`)

Audience:

- HR leadership
- executives
- operations leaders with permission

Layout:

- view mode segmented control
- filters
- main visualization area
- employee profile drawer

View modes:

- Roster Table
- Organization Map
- Department Heatmap

Roster table columns:

- Employee
- Department
- Manager
- Capacity Category
- Stress Load
- System Dependency
- Productivity
- Succession Readiness
- Confidence

Employee Profile Drawer:

- employee identity header
- capacity category
- 9-dimension radar chart
- 90-day workload trend
- stress and dependency explanation
- confidence score badge
- source evidence list
- data limitations

Capacity DNA dimensions:

- Functional Capacity
- Leadership Capacity
- Cognitive Complexity
- System Dependency
- Productivity
- Stress Load
- Growth Potential
- Succession Readiness
- Adaptability

Safety rule:

Sensitive workforce metrics require permissions such as `intelligence.workforce.sensitive`.

### 4. Constraint Log (`/intelligence/constraints`)

Audience:

- operations managers
- executives
- process owners

Layout:

- filter panel
- active constraints list
- constraint detail panel
- playbook actions

Filters:

- Human
- Process
- System
- Skill
- Decision
- Operational
- severity
- confidence
- department
- status

Constraint cards show:

- title
- constraint type
- severity
- confidence
- affected department
- affected employee/process
- detected date
- current status

Playbook card sections:

- Identify
- Exploit
- Subordinate
- Elevate
- Review

Behavior:

- Clicking a constraint opens evidence and recommended TOC actions.
- Accepted constraints can be converted into TOC tree nodes.

### 5. TOC Tree Workspace (`/intelligence/toc`)

Audience:

- executives
- strategy teams
- process analysts

Layout:

- tree selector
- ReactFlow canvas
- inspect sidebar
- evidence stream
- node action toolbar

Tree modes:

- Goal Tree
- Current Reality Tree
- Future Reality Tree

Canvas behavior:

- nodes are typed by color/shape
- edges show cause/effect direction
- confidence appears on nodes where applicable
- low-confidence nodes show warning styling

Inspect sidebar:

- node label
- node type
- explanation
- probability/confidence
- linked constraint
- source evidence
- related employees/departments

Evidence Stream:

- raw operational events
- task records
- approval records
- attendance anomalies
- score snapshots

Implementation preference:

Reuse ReactFlow patterns from Studio workflows so the product has one consistent visual language.

### 6. Decision Sandbox (`/intelligence/simulator`)

Audience:

- executives
- HR leaders
- operations leaders

Layout:

- scenario builder panel
- variable controls
- before/after delta split
- warnings panel
- saved simulations list

Scenario types:

- Promote Employee
- Open Branch
- Remove Employee
- Delegate Approval Threshold
- Increase Sales Volume
- Reduce Team Capacity
- Add Assistant Manager

Variable controls:

- sliders for workload increase
- select controls for employee/department
- numeric inputs for approval thresholds
- toggles for delegation assumptions

Delta Split:

- before state
- simulated after state
- stress delta
- dependency delta
- succession gap delta
- approval delay delta

Safety rules:

- simulations never mutate operational records
- all assumptions are visible
- low-confidence simulation inputs are highlighted
- results are saved as scenario records, not business actions

### 7. AI Advisory Inbox (`/intelligence/recommendations`)

Audience:

- executives
- authorized reviewers

Layout:

- recommendation queue
- priority filters
- recommendation detail view
- audit sidebar
- governance controls

Queue filters:

- Draft
- Needs Review
- Accepted
- Rejected
- Implemented
- Archived

Recommendation card:

- title
- short summary
- priority
- confidence
- affected area
- estimated impact
- created date

Audit Sidebar:

- source constraints
- source events
- affected employees/departments
- formula versions
- AI prompt/model metadata where relevant
- data limitations

Governance controls:

- send to review
- accept
- reject
- mark implemented
- archive
- add management note

Rule:

AI recommendations must always cite deterministic evidence from the intelligence layer.

## Commercial Packaging

Suggested product tiers:

### Standard ERP

- transactional ERP
- reports
- basic dashboards

### Intelligence Add-On

- Data Readiness Dashboard
- Workforce Capacity
- Constraint Dashboard
- executive intelligence summaries

### Enterprise OIP

- TOC Tree Workspace
- Future Reality Simulator
- AI Recommendation Engine
- advanced governance workflows
- custom intelligence formulas

This creates a clear premium module path.

## Immediate Next Steps

### Step 1: Tune The Readiness Score

Adjust the auditor so `tenant-marginal` lands closer to the intended borderline range.

Target:

- `tenant-clean`: 95-100
- `tenant-messy`: under 50
- `tenant-marginal`: 78-83

### Step 2: Persist Audit Results

Add `DataReadinessAudit`.

This allows:

- historical audit trend
- UI display
- tenant readiness history
- proof that activation was allowed or blocked

### Step 3: Add Readiness API

Create:

- `GET /api/intelligence/readiness`
- `POST /api/intelligence/readiness/run`

### Step 4: Build Data Readiness UI

First UI page:

- `/intelligence/readiness`

This should be the first product-facing intelligence screen.

### Step 5: Add Operational Event Ledger

Start with:

- SalesOrderV2 created
- SalesOrderApproval requested/approved/rejected
- Task created/assigned/completed
- Attendance check-in/check-out

### Step 6: Build Workforce Capacity Snapshots

Only after event capture is stable.

## Definition Of Success

This transformation is successful when:

- executives can see the current organizational constraint
- every recommendation has evidence
- every score has confidence
- bad data blocks AI output
- tenants can clean their data from a checklist
- the platform can simulate decisions without changing real operations
- ERP.slict.lk becomes a premium decision platform, not just an ERP system

## Final Direction

Move slowly, phase by phase.

The correct order is:

```text
Readiness
  -> Events
    -> Workforce Capacity
      -> Constraint Detection
        -> TOC Trees
          -> Simulation
            -> AI Recommendations
              -> Automation
```

This path gives ERP.slict.lk the strongest chance to become a serious Organizational Decision Intelligence platform without sacrificing trust, data safety, or maintainability.
