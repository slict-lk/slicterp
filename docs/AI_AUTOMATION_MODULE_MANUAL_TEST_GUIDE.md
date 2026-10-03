# AI & Automation Module Manual and Manual Test Guide

> This guide documents the current implementation of the AI & Automation module in this repository.
> It is written for a first-time employee who does not yet know the module, the runtime model, or the setup order.
> It also includes a complete manual testing guide and mock data pack.

---

## Table of Contents

1. [What This Module Is](#1-what-this-module-is)
2. [What This Module Is Not](#2-what-this-module-is-not)
3. [Why The ERP Needs It](#3-why-the-erp-needs-it)
4. [How The Module Works](#4-how-the-module-works)
5. [Key Concepts In Plain Language](#5-key-concepts-in-plain-language)
6. [Current Runtime Status: Real vs Registry vs Reserved](#6-current-runtime-status-real-vs-registry-vs-reserved)
7. [Who Uses This Module](#7-who-uses-this-module)
8. [What Can Be Achieved With It](#8-what-can-be-achieved-with-it)
9. [Route Map And Screen Purpose](#9-route-map-and-screen-purpose)
10. [First-Time Employee Quick Start](#10-first-time-employee-quick-start)
11. [Prerequisites For Manual Testing](#11-prerequisites-for-manual-testing)
12. [Mock Data Pack](#12-mock-data-pack)
13. [Recommended Test Build Order](#13-recommended-test-build-order)
14. [Manual Test Scenarios](#14-manual-test-scenarios)
15. [Negative And Edge Test Scenarios](#15-negative-and-edge-test-scenarios)
16. [Current Limitations And Important Notes](#16-current-limitations-and-important-notes)
17. [Troubleshooting Guide](#17-troubleshooting-guide)
18. [Expected Outcomes After A Good Rollout](#18-expected-outcomes-after-a-good-rollout)

---

## 1. What This Module Is

The AI & Automation module is the ERP's control plane for:

- AI model routing
- prompt management
- workflow orchestration
- approval-gated actions
- cross-module event handling
- embedded copilots
- audit evidence
- queue, retry, and dead-letter monitoring

In simple terms:

- Business modules create data.
- Those changes emit events.
- This module decides what should happen next.
- It enforces policy before sensitive actions run.
- It executes approved actions safely.
- It records everything for audit and analytics.

If a normal ERP module is a place where work happens, this module is the place where intelligent work is coordinated.

---

## 2. What This Module Is Not

This module is not just:

- a chatbot page
- a prompt playground
- a single AI API integration
- a replacement for CRM, Accounting, Spareparts, Real Estate, Restaurant, or Vehicle Export

It is also not the place to put random AI features without governance.

The correct mental model is:

- other modules own business records
- the AI & Automation module owns intelligence, policy, execution flow, approvals, and traceability

---

## 3. Why The ERP Needs It

Without this module:

- each business module would build its own AI logic
- prompts would be duplicated
- approvals would be inconsistent
- risky actions could run without governance
- audit evidence would be fragmented
- model provider usage would be unmanaged

With this module:

- all business modules can reuse one governed AI layer
- tenant-safe execution rules stay centralized
- approvals are consistent
- workflows can react to business events
- operators can see failures, retries, dead letters, and risk alerts in one place

---

## 4. How The Module Works

### 4.1 End-to-end flow

The runtime flow is:

1. A business action happens in a module.
2. That module publishes a domain event into the AI event bus.
3. The control plane matches active workflows that listen for that event.
4. Matching workflows are queued.
5. The queue processor runs the workflow.
6. Workflow steps execute.
7. If a step is sensitive, policy decides whether approval is required.
8. If approval is required, the action moves to the approval inbox.
9. An approver approves, rejects, requests changes, or escalates.
10. Approved actions execute through typed module action adapters.
11. The system records audit logs, analytics, and queue outcomes.

### 4.2 Plain-language architecture

| Layer | Purpose |
|---|---|
| Event Bus | Normalizes tenant-scoped business events from ERP modules |
| Workflow Runtime | Turns triggers into ordered execution steps |
| Policy Layer | Scores risk and decides auto-approve vs human approval |
| Approval Inbox | Human gate for high-impact operations |
| Action Adapters | Safe typed writes into CRM, Accounting, Spareparts, Real Estate, Restaurant, Vehicle Export, and Studio |
| Model Registry | Declares which models/providers the tenant can use |
| Prompt Registry | Stores reusable prompts instead of inline prompt strings |
| Copilot Profiles | Governs embedded assistants inside module pages |
| Queue Runtime | Handles queued execution, retries, dead letters, and idempotency |
| Audit Layer | Keeps evidence for workflows, approvals, adapter actions, and AI responses |
| Analytics Layer | Surfaces execution throughput, queue health, and predictive signals |

---

## 5. Key Concepts In Plain Language

| Term | Meaning |
|---|---|
| Domain Event | A normalized record of something that happened in the ERP, such as `crm.opportunity.created` |
| Workflow | A trigger plus an ordered set of execution steps |
| Policy Profile | The governance rule set that decides approval thresholds and approver roles |
| Approval Item | A pending decision for a risky action |
| Action Adapter | A typed runtime that performs a real business action safely |
| Model | A registered AI provider/model record for the tenant |
| Prompt | A reusable prompt template with declared variables |
| Copilot | An in-context assistant inside a module page |
| Agent | A governed AI worker profile with allowed tools and escalation rules |
| Queue Item | A scheduled workflow execution waiting to run or retry |
| Dead Letter | A workflow execution that failed too many times |
| Audit Pack | Exportable evidence bundle for compliance or investigation |

---

## 6. Current Runtime Status: Real vs Registry vs Reserved

This section is critical for new employees. Not every visible screen does the same kind of work.

### 6.1 Production-safe and real

These are real operational capabilities backed by tenant data:

- `/ai` command center
- `/ai/inbox` approval queue
- `/ai/workflows` registry
- `/ai/workflows/new` workflow creation
- `/ai/workflows/:id` live test, simulation, clone, pause, resume, archive, rollback
- `/ai/events` event observability
- `/ai/models` model CRUD and default routing
- `/ai/prompts` prompt CRUD
- `/ai/policies` policy CRUD
- `/ai/copilots` copilot CRUD
- `/ai/integrations` connector metadata CRUD
- `/ai/templates` template catalog CRUD
- `/ai/settings` settings, restore defaults, diagnostics, send test alert
- `/ai/analytics` queue and execution analytics
- `/ai/audit` audit trail and audit pack export
- embedded copilots in CRM, Accounting, Spareparts, Real Estate, Restaurant, and Vehicle Export
- queue / retry / dead-letter runtime
- event publishing from key write paths in supported modules

### 6.2 Real writes currently available through action adapters

These workflow actions create or update real tenant data:

- `crm.follow_up_task`
- `crm.email_draft`
- `accounting.write_off`
- `accounting.adjustment`
- `spareparts.reorder_proposal`
- `real-estate.schedule_viewing`
- `restaurant.shift_nudge`
- `vehicle-export.dispatch_update`
- `studio.create_record`

### 6.3 Registry or governance screens

These are real tenant-scoped records, but they are configuration surfaces rather than direct operational execution:

- Agents
- Templates
- Integrations

They matter because the module depends on them for governance, reuse, and routing, but they are not the first screens to test for downstream business writes.

### 6.4 Reserved or partially implemented workflow step types

For first-time operators, this is the most important caution:

- `action` with `module_action`: use this for real business writes
- `condition`: safe to use
- `notification`: currently behaves like an internal workflow step, not a live external mail delivery channel
- `delay`: local/synchronous behavior is limited; use only for smoke tests
- `ai_decision`: visible in the composer, but do not treat it as a production-ready live execution step yet

Practical rule:

- For reliable manual testing, use `action` steps with `module_action`

---

## 7. Who Uses This Module

### 7.1 AI roles

The module recognizes these AI roles:

- `AI_ADMIN`
- `AUTOMATION_DESIGNER`
- `APPROVER`
- `OPERATOR`
- `VIEWER`

### 7.2 What each role does

| Role | Main responsibilities |
|---|---|
| `AI_ADMIN` | Own settings, policies, models, governance posture, rollback decisions |
| `AUTOMATION_DESIGNER` | Build workflows, prompts, copilots, agents, templates |
| `APPROVER` | Review approval-gated actions |
| `OPERATOR` | Monitor analytics, failures, queues, audit, and outcomes |
| `VIEWER` | Observe the system without changing configuration |

### 7.3 Role mapping note

In this repo:

- `ADMIN` maps to full AI access
- `MANAGER` maps to designer + approver + operator + viewer
- `USER` maps to operator + viewer
- `VIEWER` maps to viewer only

---

## 8. What Can Be Achieved With It

### 8.1 Cross-module outcomes

| Module | Example business outcome |
|---|---|
| CRM | Auto-create follow-up tasks, generate draft outreach, escalate risky deals |
| Accounting | Post governed adjustments, route financial write-offs for approval, monitor queue failures |
| Spareparts | Generate real purchase order proposals from events or live tests |
| Real Estate | Schedule property viewings from workflows |
| Restaurant | Push operational shift memos and guidance |
| Vehicle Export | Update shipment/vehicle dispatch state with governance |
| Studio | Create records in dynamic custom modules through workflows |

### 8.2 Strategic outcomes

What this module should help the ERP achieve over time:

- lower manual coordination effort
- fewer missed follow-ups
- more consistent approvals
- faster response times
- cleaner audit trails
- safer AI adoption inside every module

---

## 9. Route Map And Screen Purpose

| Route | Screen purpose | Main user |
|---|---|---|
| `/ai` | Command center for status, risk, heatmap, failures | Operator |
| `/ai/inbox` | Approval queue | Approver |
| `/ai/workflows` | Workflow registry | Designer |
| `/ai/workflows/new` | Workflow composer | Designer |
| `/ai/workflows/:id` | Workflow detail, simulation, queue, rollback | Designer / Operator |
| `/ai/agents` | Agent registry | Designer |
| `/ai/agents/new` | Agent composer | Designer |
| `/ai/agents/:id` | Agent detail and history | Designer / Operator |
| `/ai/copilots` | Copilot profiles | Designer |
| `/ai/events` | Event observability | Operator |
| `/ai/policies` | Governance policies | AI Admin |
| `/ai/models` | Model registry | AI Admin / Designer |
| `/ai/prompts` | Prompt registry | Designer |
| `/ai/integrations` | Connector metadata registry | AI Admin |
| `/ai/templates` | Reusable workflow blueprints | Designer |
| `/ai/analytics` | Throughput, queue health, predictions | Operator |
| `/ai/audit` | Audit evidence and export | AI Admin / Operator |
| `/ai/settings` | Tenant defaults, diagnostics, retry posture | AI Admin |

---

## 10. First-Time Employee Quick Start

If you have never touched this module before, follow this order.

### 10.1 Understand the purpose first

Start at `/ai` and answer these questions:

1. Which modules are already covered?
2. Are there pending approvals?
3. Are there failed runs?
4. Is any model registered?
5. Is there a default policy profile?

### 10.2 Learn the minimum build order

If the tenant is empty, build in this order:

1. Settings
2. Models
3. Prompts
4. Policies
5. Copilots
6. Templates
7. Agents
8. Workflows
9. Approval Inbox
10. Analytics and Audit

### 10.3 Learn the minimum operating order

If the tenant is already configured, work in this order:

1. Command Center
2. Approval Inbox
3. Workflow detail for failures
4. Analytics
5. Audit
6. Settings and diagnostics only if something is broken

### 10.4 Rule of thumb

- If you want to configure intelligence, go to Models, Prompts, Policies, Copilots, and Workflows.
- If you want to control execution, go to Inbox, Workflows, Analytics, and Audit.
- If you want to understand what just happened, go to Events, Workflow Detail, and Audit.

---

## 11. Prerequisites For Manual Testing

| Requirement | Details |
|---|---|
| Running ERP | Start the app normally in local dev |
| Logged-in tenant user | Use an `ADMIN` or `MANAGER` first |
| Background worker behavior | Queue tests require the app job loop to be running |
| Provider availability | For live AI responses, configure `GROQ_API_KEY` or local inference fallback |
| Browser | Chrome or Edge with DevTools network tab open |
| Business data | Create or reuse records in CRM, Accounting, Spareparts, Real Estate, Restaurant, Vehicle Export, and optionally Studio |

### 11.1 Recommended test users

| User | Suggested role | Purpose |
|---|---|---|
| `ai-admin@test.local` | `ADMIN` | Full module setup |
| `approver@test.local` | `MANAGER` or explicit `APPROVER` | Approval testing |
| `operator@test.local` | `USER` | Monitoring and copilot testing |
| `viewer@test.local` | `VIEWER` | Read-only checks |

### 11.2 Recommended pre-test settings

Before deep testing:

- set a default policy profile
- register one default model
- enable diagnostics
- set `maxExecutionAttempts = 1` for dead-letter testing
- set `maxExecutionAttempts = 2` and `retryBackoffMinutes = 1` for retry testing

---

## 12. Mock Data Pack

This section gives a stable data pack for manual testing.
Use these names and values exactly where possible.
For generated IDs, capture the real IDs from your tenant after creation.

### 12.1 ID capture worksheet

Fill this table during setup.

| Variable | Record to create or locate | Actual ID |
|---|---|---|
| `CRM_LEAD_ID` | CRM lead `BlueWave Logistics - Renewal Lead` | |
| `CRM_OPPORTUNITY_ID` | CRM opportunity `BlueWave Renewal FY26` | |
| `CRM_ACCOUNT_ID` | CRM account `BlueWave Logistics` | |
| `ACCOUNT_CODE_DEBIT` | Existing expense or write-off account code | |
| `ACCOUNT_CODE_CREDIT` | Existing receivable or clearing account code | |
| `SPAREPARTS_SUPPLIER_ID` | Supplier `Lanka Spares Wholesale` | |
| `SPAREPARTS_PRODUCT_1_ID` | Product `Brake Pad Set - Front` | |
| `SPAREPARTS_PRODUCT_2_ID` | Product `Engine Oil Filter - Universal` | |
| `PROPERTY_ID` | Property `Ocean View Tower A-12` | |
| `VEHICLE_ID` | Export vehicle `VEH-2026-001` | |
| `SHIPMENT_ID` | Shipment `SHP-2026-001` | |
| `STUDIO_MODULE_ID` | Studio module `AI Test Queue Records` | |

### 12.2 Model registry data

#### Model A

| Field | Value |
|---|---|
| Name | `Groq Fast Lane` |
| Provider | `GROQ` |
| Model ID | `llama-3.3-70b-versatile` |
| Description | `Primary low-latency model for copilots and workflow reasoning.` |
| Capabilities | `chat, summarize, workflow_reasoning, classification` |
| Context Window | `32768` |
| Max Tokens | `2048` |
| Temperature | `0.2` |
| API Endpoint | leave blank unless tenant uses custom endpoint |
| API Key | enter tenant secret if required |
| Default | `Yes` |
| Active | `Yes` |

#### Model B

| Field | Value |
|---|---|
| Name | `Local Ollama` |
| Provider | `OLLAMA` |
| Model ID | `llama3.1` |
| Description | `Local fallback model for offline development.` |
| Capabilities | `chat, summarize` |
| Context Window | `8192` |
| Max Tokens | `1024` |
| Temperature | `0.3` |
| API Endpoint | `http://localhost:11434` |
| API Key | leave blank |
| Default | `No` |
| Active | `Yes` |

### 12.3 Prompt registry data

#### Prompt A

| Field | Value |
|---|---|
| Name | `CRM Opportunity Risk Summary` |
| Category | `SALES` |
| Description | `Summarize deal risk and recommended next action.` |
| Template | `Summarize the opportunity risk for {{account_name}}. Opportunity amount: {{amount}}. Next activity: {{next_activity}}. Return: 1) risk level 2) reasons 3) next best action.` |
| Variables | `account_name, amount, next_activity` |
| Bound Model | `Groq Fast Lane` |
| Active | `Yes` |

#### Prompt B

| Field | Value |
|---|---|
| Name | `Accounting Variance Explanation` |
| Category | `ANALYTICS` |
| Description | `Explain the likely cause of a financial variance.` |
| Template | `Explain this accounting variance for {{period}}. Expected: {{expected_total}}. Actual: {{actual_total}}. Return a concise explanation and a recommended follow-up action.` |
| Variables | `period, expected_total, actual_total` |
| Bound Model | `Groq Fast Lane` |
| Active | `Yes` |

### 12.4 Policy data

#### Policy A

| Field | Value |
|---|---|
| Name | `Customer Communications Review` |
| Category | `customer_comms` |
| Description | `Require approval for higher-risk customer communication workflows.` |
| Approval Threshold | `40` |
| Auto-Approve Below | `10` |
| Approver Roles | `AI_ADMIN, APPROVER` |
| Escalation Roles | `AI_ADMIN` |
| Approval SLA Minutes | `60` |
| Separation of Duties | `Yes` |
| Active | `Yes` |

#### Policy B

| Field | Value |
|---|---|
| Name | `Financial Adjustment Control` |
| Category | `financial` |
| Description | `Govern write-offs and accounting adjustments.` |
| Approval Threshold | `20` |
| Auto-Approve Below | `0` |
| Approver Roles | `AI_ADMIN, APPROVER` |
| Escalation Roles | `AI_ADMIN` |
| Approval SLA Minutes | `30` |
| Separation of Duties | `Yes` |
| Active | `Yes` |

### 12.5 Copilot profiles

#### CRM Copilot

| Field | Value |
|---|---|
| Label | `CRM Copilot` |
| Module | `crm` |
| Allowed Intents | `summarize_account, draft_outreach, next_best_action` |
| Data Sources | `leads, opportunities, accounts, activities` |
| Response Mode | `draft_then_approve` |
| Action Permissions | `crm.follow_up_task, crm.email_draft` |
| Enabled | `Yes` |

#### Accounting Copilot

| Field | Value |
|---|---|
| Label | `Accounting Copilot` |
| Module | `accounting` |
| Allowed Intents | `variance_summary, reconcile_suggestion, close_checklist` |
| Data Sources | `invoices, payments, journal_entries, accounting_periods` |
| Response Mode | `suggest_only` |
| Action Permissions | `accounting.adjustment, accounting.write_off` |
| Enabled | `Yes` |

### 12.6 Integration registry data

| Field | Value |
|---|---|
| Label | `Groq API` |
| Key | `groq_primary` |
| Status | `connected` |
| Scope | `chat completion, model routing, copilot inference` |
| Retry Policy | `3 retries / exponential backoff` |
| Auth Mode | `api_key` |

### 12.7 Template data

| Field | Value |
|---|---|
| Name | `Opportunity Follow-up Orchestration` |
| Category | `sales_follow_up` |
| Compatible Modules | `crm` |
| Safety Profile | `approval_required` |
| Description | `Create a follow-up task or email draft when a new opportunity needs guided outreach.` |

### 12.8 Agent data

| Field | Value |
|---|---|
| Name | `CRM Workflow Agent` |
| Type | `WORKFLOW` |
| Module Scope | `crm` |
| Model | `Groq Fast Lane` |
| Description | `Executes CRM automation assistance under approval-gated guardrails.` |
| Allowed Tools | `search_customer`, `summarize_activity`, `draft_follow_up` |
| Escalation Policy | `approval_gate` |

### 12.9 Business data pack

#### CRM

| Record Type | Example value |
|---|---|
| Account | `BlueWave Logistics` |
| Lead | `BlueWave Logistics - Renewal Lead` |
| Opportunity | `BlueWave Renewal FY26` |
| Opportunity Amount | `125000` |
| Priority | `HIGH` |

#### Accounting

| Record Type | Example value |
|---|---|
| Open period | Current open month |
| Invoice | `INV-AI-1001` |
| Customer | `BlueWave Logistics` |
| Total | `125000` |
| Debit account code | use a valid tenant account code |
| Credit account code | use a valid tenant account code |

#### Spareparts

| Record Type | Example value |
|---|---|
| Supplier | `Lanka Spares Wholesale` |
| Product 1 | `Brake Pad Set - Front` |
| Product 2 | `Engine Oil Filter - Universal` |

#### Real Estate

| Record Type | Example value |
|---|---|
| Property | `Ocean View Tower A-12` |
| Client Name | `Nadeesha Fernando` |
| Client Email | `nadeesha.fernando@test.local` |

#### Restaurant

| Record Type | Example value |
|---|---|
| Shift note text | `Watch fryer oil usage during the evening shift.` |

#### Vehicle Export

| Record Type | Example value |
|---|---|
| Vehicle | `VEH-2026-001` |
| Shipment | `SHP-2026-001` |
| Shipment Status | `SAILED` |

#### Studio

| Record Type | Example value |
|---|---|
| Module | `AI Test Queue Records` |
| Record data | `{"title":"Queue smoke test","status":"new"}` |

### 12.10 Copy-paste workflow step configs

#### Real CRM follow-up task

```json
{
  "actionType": "module_action",
  "module": "crm",
  "action": "follow_up_task",
  "payload": {
    "title": "Call BlueWave about renewal proposal",
    "description": "Created by AI manual test workflow.",
    "priority": "HIGH",
    "opportunityId": "CRM_OPPORTUNITY_ID",
    "accountId": "CRM_ACCOUNT_ID",
    "dueAt": "2026-03-20T09:00:00.000Z"
  }
}
```

#### Real CRM email draft

```json
{
  "actionType": "module_action",
  "module": "crm",
  "action": "email_draft",
  "payload": {
    "subject": "Renewal follow-up for BlueWave Logistics",
    "body": "Hello BlueWave team, this is a draft follow-up regarding your FY26 renewal.",
    "opportunityId": "CRM_OPPORTUNITY_ID",
    "accountId": "CRM_ACCOUNT_ID",
    "recipientEmail": "procurement@bluewave.test"
  }
}
```

#### Real accounting adjustment

```json
{
  "actionType": "module_action",
  "module": "accounting",
  "action": "adjustment",
  "payload": {
    "reference": "AI-ADJ-MANUAL-001",
    "description": "Manual test adjustment from AI workflow",
    "lines": [
      {
        "accountCode": "ACCOUNT_CODE_DEBIT",
        "description": "Manual test debit",
        "debit": 1000,
        "credit": 0
      },
      {
        "accountCode": "ACCOUNT_CODE_CREDIT",
        "description": "Manual test credit",
        "debit": 0,
        "credit": 1000
      }
    ]
  }
}
```

#### Real spareparts reorder proposal

```json
{
  "actionType": "module_action",
  "module": "spareparts",
  "action": "reorder_proposal",
  "payload": {
    "supplierId": "SPAREPARTS_SUPPLIER_ID",
    "expectedDate": "2026-03-25",
    "notes": "AI reorder proposal test",
    "isTaxEnabled": true,
    "items": [
      {
        "productId": "SPAREPARTS_PRODUCT_1_ID",
        "quantity": 40,
        "unitCost": 42.5
      },
      {
        "productId": "SPAREPARTS_PRODUCT_2_ID",
        "quantity": 120,
        "unitCost": 7.75
      }
    ]
  }
}
```

#### Real property viewing schedule

```json
{
  "actionType": "module_action",
  "module": "real-estate",
  "action": "schedule_viewing",
  "payload": {
    "propertyId": "PROPERTY_ID",
    "clientName": "Nadeesha Fernando",
    "clientEmail": "nadeesha.fernando@test.local",
    "clientPhone": "+94770000000",
    "scheduledAt": "2026-03-22T10:30:00.000Z",
    "notes": "Manual AI workflow viewing test"
  }
}
```

#### Real restaurant shift nudge

```json
{
  "actionType": "module_action",
  "module": "restaurant",
  "action": "shift_nudge",
  "payload": {
    "text": "Watch fryer oil usage during the evening shift.",
    "audience": "kitchen"
  }
}
```

#### Real vehicle export dispatch update

```json
{
  "actionType": "module_action",
  "module": "vehicle-export",
  "action": "dispatch_update",
  "payload": {
    "shipmentId": "SHIPMENT_ID",
    "shipmentStatus": "SAILED"
  }
}
```

#### Real Studio record creation

```json
{
  "actionType": "module_action",
  "module": "studio",
  "action": "create_record",
  "payload": {
    "moduleId": "STUDIO_MODULE_ID",
    "data": {
      "title": "Queue smoke test",
      "status": "new"
    }
  }
}
```

#### Condition step example

```json
{
  "label": "Only high priority",
  "field": "trigger.priority",
  "operator": "equals",
  "value": "HIGH"
}
```

---

## 13. Recommended Test Build Order

For a clean tenant, use this build sequence:

1. Open `/ai/settings` and restore defaults
2. Register at least one model
3. Create at least one prompt
4. Create at least one policy profile
5. Create at least one copilot
6. Create at least one agent
7. Publish at least one template
8. Create a real workflow using a module action
9. Run a live test
10. Trigger an event-driven workflow from a module
11. Verify approvals, analytics, events, and audit

---

## 14. Manual Test Scenarios

### T01. Command center loads correctly

**Goal**: Confirm the module shell and top navigation work.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to `/ai` | Command center loads |
| 2 | Confirm top actions are visible | `New Workflow`, `New Agent`, `Policy Center`, `Approvals`, `Run Diagnostics` visible |
| 3 | Open each tab in the AI nav | Each route loads without crash |
| 4 | Return to `/ai` | Overview shows summary cards, risk alerts, module heatmap, approvals, failed runs |

### T02. Restore defaults and inspect diagnostics

**Goal**: Confirm settings can be reset and diagnostics reflect tenant posture.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open `/ai/settings` | Settings page loads |
| 2 | Click `Restore Defaults` | Form resets to tenant defaults |
| 3 | Click `Send Test Alert` | A test alert is created |
| 4 | Return to `/ai` | Risk Alerts now includes the new test alert |
| 5 | Re-open `/ai/settings` | Diagnostics show status for tenant config, workflow registry, model routing, and provider keys |

### T03. Create a real model record

**Goal**: Confirm the model registry persists tenant model records.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/ai/models` | Model registry page loads |
| 2 | Click `Add Model` | Form becomes editable |
| 3 | Enter the mock values for `Groq Fast Lane` | Form accepts values |
| 4 | Save | Row appears in registry table |
| 5 | Click `Set Default` if needed | Selected row shows `default` |
| 6 | Create `Local Ollama` as second model | Second row appears |

### T04. Create prompt records

**Goal**: Confirm prompts are tenant-scoped and can bind to registered models.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/ai/prompts` | Prompt registry page loads |
| 2 | Create `CRM Opportunity Risk Summary` | Prompt row appears |
| 3 | Bind it to `Groq Fast Lane` | Bound model saved |
| 4 | Create `Accounting Variance Explanation` | Second prompt appears |
| 5 | Edit one prompt and save | Changes persist after refresh |

### T05. Create policy profiles

**Goal**: Confirm approval governance is configurable.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/ai/policies` | Policy page loads |
| 2 | Create `Customer Communications Review` | Policy row appears |
| 3 | Create `Financial Adjustment Control` | Second policy appears |
| 4 | Confirm thresholds, roles, SLA, and separation-of-duties save | Saved values persist on refresh |

### T06. Create copilot profiles

**Goal**: Enable embedded copilots in module pages.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/ai/copilots` | Copilot page loads |
| 2 | Create `CRM Copilot` using the mock values | Copilot appears in table |
| 3 | Create `Accounting Copilot` | Second copilot appears |
| 4 | Confirm both are `enabled` | Status shows enabled |

### T07. Create integration registry entries

**Goal**: Confirm connector governance metadata is persisted.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/ai/integrations` | Connector registry page loads |
| 2 | Create `Groq API` | Integration row appears |
| 3 | Edit retry policy and save | Updated value persists |

### T08. Publish a template

**Goal**: Confirm reusable workflow blueprint catalog is available.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/ai/templates` | Template catalog loads |
| 2 | Create `Opportunity Follow-up Orchestration` | Template row appears |
| 3 | Click `Use in Workflow` | Redirects to `/ai/workflows/new` |

### T09. Create an agent

**Goal**: Confirm agent registry records can be created.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/ai/agents/new` | Agent composer loads |
| 2 | Enter the mock data for `CRM Workflow Agent` | Form accepts values |
| 3 | Publish | Redirects to agent detail page |
| 4 | Open `/ai/agents` | New agent appears in registry |

### T10. Create a safe real workflow for CRM follow-up

**Goal**: Create a workflow that performs a real CRM write.

Use these composer values:

| Field | Value |
|---|---|
| Workflow name | `CRM Follow-up Task - Manual Test` |
| Module scope | `crm` |
| Trigger event | `manual.crm.followup` |
| Policy profile | `Customer Communications Review` |
| Approvals mode | `never` |
| Description | `Creates a real CRM follow-up task for manual testing.` |
| Filters JSON | `{}` |

Add one `action` step and paste the `crm.follow_up_task` config from the mock data section after replacing placeholders with real IDs.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open `/ai/workflows/new` | Composer loads |
| 2 | Enter workflow header fields | No validation errors |
| 3 | Add the action step config | JSON remains valid |
| 4 | Click `Validate` | Validation passes |
| 5 | Click `Run Simulation` | Simulation succeeds |
| 6 | Click `Publish` | Redirects to workflow detail page |

### T11. Run a live test for the CRM workflow

**Goal**: Confirm a live test creates a real CRM task.

| Step | Action | Expected Result |
|---|---|---|
| 1 | On the workflow detail page, keep the default payload or enter `{"source":"manual-test","initiatedBy":"<your-user-id>"}` | Payload is valid JSON |
| 2 | Click `Run Live Test` | Workflow executes |
| 3 | Check `Execution History` | A new execution row appears |
| 4 | Open CRM tasks | A real follow-up task exists for the configured account/opportunity |
| 5 | Open `/ai/audit` | Audit trail includes workflow and adapter events |

### T12. Create a workflow that requires approval

**Goal**: Confirm policy and approval routing work.

Use these values:

| Field | Value |
|---|---|
| Workflow name | `Accounting Adjustment - Approval Test` |
| Module scope | `accounting` |
| Trigger event | `manual.accounting.adjustment` |
| Policy profile | `Financial Adjustment Control` |
| Approvals mode | `always` |
| Description | `Creates an approval-gated accounting adjustment.` |

Add one `action` step using the `accounting.adjustment` config from the mock data pack after replacing account code placeholders.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Create and publish the workflow | Workflow detail page loads |
| 2 | Click `Run Live Test` | Execution creates an approval item instead of writing immediately |
| 3 | Open `/ai/inbox` | New approval item appears |
| 4 | Verify title, module, risk, due time, and action buttons | Row displays correctly |

### T13. Approve an item

**Goal**: Confirm approval executes the stored action.

| Step | Action | Expected Result |
|---|---|---|
| 1 | In `/ai/inbox`, enter a note | Note accepted |
| 2 | Click `Approve` | Status updates and row is removed or refreshed |
| 3 | Open Accounting journal entries | A real journal entry exists |
| 4 | Open `/ai/audit` | Audit trail records approval action and adapter execution |

### T14. Reject, request changes, and escalate

**Goal**: Confirm all inbox decisions work.

Create another approval-gated run first, then test each path on separate items.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Trigger another approval item | New inbox row appears |
| 2 | Click `Reject` | Approval status changes and execution does not occur |
| 3 | Trigger another approval item | New inbox row appears |
| 4 | Click `Request Changes` | Approval item updates accordingly |
| 5 | Trigger another approval item | New inbox row appears |
| 6 | Click `Escalate` | Escalation metadata and notifications are recorded |

### T15. Bulk approve

**Goal**: Confirm batch inbox operations work.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Create two or more approval items | Multiple inbox rows appear |
| 2 | Select the checkboxes | Bulk count increments |
| 3 | Click `Bulk Approve` | Selected items are processed |
| 4 | Check downstream module records | Corresponding real writes exist where applicable |

### T16. Event bus and event page visibility

**Goal**: Confirm real ERP mutations create visible events.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Create a new CRM opportunity in the CRM module | Mutation succeeds |
| 2 | Open `/ai/events` | A `crm.opportunity.created` event appears |
| 3 | Create an accounting invoice | A corresponding accounting event appears |
| 4 | Create a spareparts purchase order or sale | A spareparts event appears |

### T17. Event-driven workflow execution

**Goal**: Confirm module events can trigger workflows without manual live test.

Create a workflow:

| Field | Value |
|---|---|
| Workflow name | `CRM Opportunity Event Follow-up` |
| Module scope | `crm` |
| Trigger event | `crm.opportunity.created` |
| Policy profile | `Customer Communications Review` |
| Approvals mode | `never` |

Use one `crm.follow_up_task` action step with fixed real IDs from the worksheet.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Publish the workflow | Workflow becomes active |
| 2 | Create a new CRM opportunity | Event is published |
| 3 | Wait for the queue processor | Workflow execution is eventually recorded |
| 4 | Open `/ai/workflows/:id` | Execution history shows a new run |
| 5 | Open CRM tasks | A real follow-up task exists |

### T18. Workflow simulation, clone, pause, resume, archive, rollback

**Goal**: Confirm lifecycle management works.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open a workflow detail page | Workflow details load |
| 2 | Click `Run Simulation` | Simulation result panel appears |
| 3 | Click `Pause Workflow` | Enabled becomes `No` |
| 4 | Click `Resume Workflow` | Enabled becomes `Yes` |
| 5 | Click `Clone Workflow` | New workflow copy opens |
| 6 | Click `Archive Workflow` on the clone | Workflow status becomes archived |
| 7 | On the original workflow, use `Rollback to Selected Version` | A new version record is created and state is restored |

### T19. Dead-letter behavior

**Goal**: Confirm failed queued executions move to dead letter.

Preparation:

- In `/ai/settings`, set `maxExecutionAttempts = 1`

Create this workflow:

| Field | Value |
|---|---|
| Workflow name | `Broken Viewing Workflow - Dead Letter Test` |
| Module scope | `real-estate` |
| Trigger event | `real-estate.property.created` |
| Policy profile | `Customer Communications Review` |
| Approvals mode | `never` |

Use this action config with an intentionally wrong property ID:

```json
{
  "actionType": "module_action",
  "module": "real-estate",
  "action": "schedule_viewing",
  "payload": {
    "propertyId": "missing-property-id",
    "clientName": "Dead Letter Tester",
    "clientEmail": "deadletter@test.local",
    "scheduledAt": "2026-03-22T10:30:00.000Z"
  }
}
```

| Step | Action | Expected Result |
|---|---|---|
| 1 | Publish the workflow | Workflow active |
| 2 | Create a new property record in Real Estate | Trigger event is emitted |
| 3 | Wait for queue processing | Workflow fails |
| 4 | Open workflow detail | Dead-letter section contains the failed run |
| 5 | Open `/ai/analytics` | Dead letter count is greater than zero |
| 6 | Open `/ai` | Failed run or alert is visible |

### T20. Retry behavior

**Goal**: Confirm failed queued executions retry before dead-lettering.

Preparation:

- In `/ai/settings`, set `maxExecutionAttempts = 2`
- Set `retryBackoffMinutes = 1`

Use the same broken workflow from T19.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Trigger the workflow again with a matching event | Queue item is created |
| 2 | Open workflow detail shortly after the event | Item appears under `Queued / Retrying` |
| 3 | Wait at least one minute | Retry occurs |
| 4 | Re-open workflow detail | Item either retries again or lands in dead letter after max attempts |

### T21. Embedded copilots in business modules

**Goal**: Confirm module copilots respond inside real module pages.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open the CRM dashboard page | Copilot panel is visible |
| 2 | Ask a question such as `Summarize current CRM risk and next best action.` | Response is returned if model routing is available |
| 3 | Confirm the panel shows module context tags | Context badges visible |
| 4 | Repeat in Accounting, Spareparts, Real Estate, Restaurant, and Vehicle Export | Each page loads its own copilot panel |

If no model provider is available, expect an error toast or a provider warning instead of a useful response.

### T22. Analytics page

**Goal**: Confirm the analytics page reflects real runtime activity.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open `/ai/analytics` after creating workflows, approvals, and failures | KPI cards contain non-zero values |
| 2 | Check `Throughput` | Period rows reflect runs and approvals |
| 3 | Check `Queue Health` | Pending, retrying, dead-letter counts match recent tests |
| 4 | Check `Predictive Signals` | Heuristic signals appear once enough data exists |

### T23. Audit page and audit pack export

**Goal**: Confirm evidence records can be reviewed and exported.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open `/ai/audit` | Audit table loads |
| 2 | Verify rows exist for event bus, approvals, queue, or adapters | Records visible |
| 3 | Click `Export Audit Pack` | A JSON file downloads |
| 4 | Open the JSON file | Bundle contains tenant audit evidence |

### T24. Models, prompts, policies, copilots, integrations, templates CRUD

**Goal**: Confirm registry CRUD screens behave consistently.

For each of the following routes:

- `/ai/models`
- `/ai/prompts`
- `/ai/policies`
- `/ai/copilots`
- `/ai/integrations`
- `/ai/templates`

Perform:

| Step | Action | Expected Result |
|---|---|---|
| 1 | Create a record | Row appears in list |
| 2 | Edit the same record | Changes persist |
| 3 | Refresh the page | Values remain |
| 4 | Delete the record | Row is removed |

### T25. Agent registry and detail view

**Goal**: Confirm agent records and detail views are operational.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open `/ai/agents` | Agent registry loads |
| 2 | Click an agent name | Detail page opens |
| 3 | Review guardrails | Allowed tools and escalation policy display |
| 4 | Review execution history | Table loads without error |

### T26. Settings save behavior

**Goal**: Confirm control-plane settings persist.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Change `defaultPolicyProfileId` | Input changes |
| 2 | Change `maxExecutionAttempts` | Input changes |
| 3 | Change `retryBackoffMinutes` | Input changes |
| 4 | Click `Save Settings` | Success toast appears |
| 5 | Refresh the page | Saved values remain |

### T27. Studio adapter smoke test

**Goal**: Confirm the module can create a custom Studio record through the control plane.

Create a workflow:

| Field | Value |
|---|---|
| Workflow name | `Studio Record Creation Test` |
| Module scope | `studio` |
| Trigger event | `manual.studio.create_record` |
| Policy profile | any active policy |
| Approvals mode | `never` |

Use the `studio.create_record` config from the mock data pack.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Publish the workflow | Workflow created |
| 2 | Run a live test | Execution succeeds |
| 3 | Open the Studio module | Record exists |

---

## 15. Negative And Edge Test Scenarios

### N01. Missing required workflow JSON

| Step | Action | Expected Result |
|---|---|---|
| 1 | In workflow composer, enter invalid JSON in filters or step config | Validation fails |
| 2 | Click `Publish` | Error message shown |

### N02. Missing policy profile

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear the policy profile field in workflow composer | Required field missing |
| 2 | Click `Validate` | Validation error shown |

### N03. Invalid accounting entry

| Step | Action | Expected Result |
|---|---|---|
| 1 | Create an accounting adjustment workflow with unbalanced debit/credit | Workflow can be saved |
| 2 | Run test or approval execution | Action fails with balanced-entry error |

### N04. Disabled copilot

| Step | Action | Expected Result |
|---|---|---|
| 1 | Disable a module copilot | Copilot config saves |
| 2 | Open the module page and ask the copilot | Request fails because no enabled copilot exists |

### N05. Viewer access

| Step | Action | Expected Result |
|---|---|---|
| 1 | Sign in as a viewer-only user | Session established |
| 2 | Open `/ai` | Overview may load if permitted |
| 3 | Try opening edit-heavy routes such as `/ai/settings` or posting changes | Access is blocked |

### N06. Missing provider configuration

| Step | Action | Expected Result |
|---|---|---|
| 1 | Remove provider key availability or use an unavailable local model | Diagnostics warn |
| 2 | Ask a copilot question | Error or degraded response path appears |

---

## 16. Current Limitations And Important Notes

These are implementation notes a new employee must know before promising behavior to stakeholders.

### 16.1 Workflow step cautions

- Use `action` steps with `module_action` for real business writes
- `notification` is not a full external notification product yet
- `delay` is not a long-horizon scheduler in the workflow node runtime
- `ai_decision` should be treated as reserved until its live execution path is completed

### 16.2 Queue testing cautions

- `Run Live Test` executes directly and does not prove queue behavior
- queue tests must be triggered by real domain events
- dead-letter tests are easiest with `maxExecutionAttempts = 1`

### 16.3 Integrations and templates

- Integrations are currently a real governance registry, not a full external connector wizard
- Templates are reusable catalog entries, not one-click workflow instantiation

### 16.4 Embedded copilots

- Copilots require an enabled module copilot profile
- useful responses require an available model route

---

## 17. Troubleshooting Guide

| Problem | Likely cause | What to check |
|---|---|---|
| `/ai` loads but everything is empty | No tenant AI records yet | Start with models, policies, prompts, copilots, and workflows |
| Copilot returns an error | No enabled copilot or no provider available | Check `/ai/copilots`, `/ai/models`, and diagnostics |
| Workflow simulation passes but live run fails | Simulation checks structure, not all runtime conditions | Check adapter inputs, record IDs, account codes, and audit logs |
| Approval item appears but nothing executes | Item not approved yet or approval rejected | Check `/ai/inbox` and audit trail |
| Event-driven workflow never runs | Trigger event mismatch or queue not processing | Check `/ai/events`, workflow trigger string, and queue runtime |
| Workflow lands in dead letter | Adapter validation failure, missing record, or business rule error | Open workflow detail dead-letter section and audit trail |
| Accounting adjustment fails | No open period, invalid account code, or unbalanced lines | Check accounting period and line totals |
| Real Estate viewing fails | `propertyId` missing or invalid | Verify `PROPERTY_ID` belongs to the current tenant |
| Vehicle dispatch update fails | Shipment/vehicle IDs invalid or status payload incomplete | Verify `SHIPMENT_ID`, `VEHICLE_ID`, and payload |
| Audit pack export is empty | No control-plane activity yet | Run workflow, approval, or copilot tests first |

---

## 18. Expected Outcomes After A Good Rollout

If the module is configured correctly, a new employee should be able to:

1. explain the module as a control plane, not a chatbot
2. register a tenant model and prompt
3. create a policy and approval chain
4. enable a module copilot
5. publish a real workflow using a module action
6. run a live test that creates a real downstream record
7. trigger an event-driven workflow from a business module
8. approve or reject risky actions from the inbox
9. inspect queue health, failed runs, and dead letters
10. export an audit pack for evidence

That is the correct standard for understanding this module.
