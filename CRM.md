# Sales & CRM ERP Rebuild Plan (Industry-Grade, Multi-Tenant, Multi-Branch Ready)

## Summary

Build an advanced, real-world `Sales + CRM` module on top of the current Next.js + Prisma ERP, using the **vehicle-export module as the backend/domain workflow benchmark** and the **restaurant module as the UX interaction benchmark** (but not as a data persistence benchmark).

This plan is designed around your decisions:
- `Mixed Generic ERP` go-live focus
- `Rebuild with migration` (no data loss)
- `Operational Core first`
- `Shared Party Master`
- `Multi-branch ready`
- Constraint: use additive-safe Prisma schema evolution (`prisma db push`) without losing existing DB data

The result is a production-ready, extensible sales/CRM foundation that can support vehicle export, spare parts, wholesale, and services.

## Current State Assessment (What Exists and What Must Change)

### Platform strengths to preserve
- Multi-tenant architecture exists (`Tenant`, `User`, module permissions, middleware).
- Rich module catalog and RBAC in `src/lib/modules.ts`.
- Vehicle export module demonstrates strong domain workflow design, status-driven operations, and clearer internal/public API separation (`src/app/api/vehicle-export/*`, `src/apps/vehicle-export/*`, docs in `docs/VEHICLE_EXPORT_MODULE.md`).
- Restaurant module demonstrates high-quality UI patterns and operational dashboards (`src/app/(dashboard)/restaurant/*`).

### Current Sales/CRM issues blocking “industry standard” status
- `sales` data model is too thin for real operations:
  - `Lead` lacks `priority`, `expectedRevenue`, `probability` columns (UI expects them).
  - `Opportunity` schema lacks relation fields expected by API/UI (`customer` include used in API).
  - `Quotation`/`SalesOrder` have no line-item tables though forms collect lines.
- API/UI contract mismatches:
  - `OpportunityForm` uses `expectedRevenue`/`expectedCloseDate`, API writes `amount`/`closeDate`.
  - stage names differ between UI and API (`QUALIFICATION` etc vs `PROSPECTING` style).
  - `/api/sales/customers` returns paginated payload, some screens expect raw arrays.
- CRUD completeness is inconsistent:
  - UI calls `/api/sales/opportunities/[id]`, `/api/sales/orders/[id]`, `/api/sales/quotations/[id]`, but routes are missing.
- Security/tenancy consistency is weak in sales/restaurant routes:
  - many routes use `getOrCreateDefaultTenant()` fallback instead of consistent authenticated tenant resolution.
- Restaurant backend is mixed maturity:
  - `tables` uses JSON file storage (`src/app/api/restaurant/tables/route.ts`) while other parts use Prisma/POS APIs.
  - `setup` page is mostly UI simulation without persisted config (`src/app/(dashboard)/restaurant/setup/page.tsx`).

## Architecture Direction (Decision Complete)

## 1. Domain Boundaries (Target)
Create a **shared business core** with clear bounded contexts:

- `Party & Relationship Management` (shared master data)
- `CRM` (lead/opportunity/pipeline/activity/tasks)
- `Sales` (quote/order/approval/fulfillment handoff)
- `Commercial Rules` (pricing, taxes, credit, discounts, approvals)
- `Operational Handoffs` (inventory, POS, accounting, export logistics)

Use the same dashboard route family (`/sales`) but separate internals and permissions for `crm` and `sales`.

## 2. Design Principle (from current modules)
- Backend/domain logic style: follow `vehicle-export` approach
- UX polish style: follow `restaurant`/`vehicle-export` dashboards
- Data integrity and persistence: Prisma-first only (no JSON/file persistence for core operations)
- API contracts: stable, typed, versioned internally via service layer

## 3. Migration Strategy (No Data Loss, `db push` Constraint)
Use **expand-and-migrate** only:
- Add new tables/columns first (`prisma db push`)
- Backfill data with scripts
- Dual-read/dual-write adapters temporarily (short-lived)
- Switch UI/API to new canonical models
- Mark legacy fields/tables read-only before any future cleanup
- Do not rename/drop columns in the same phase as data migration
- Take DB backup/export before every schema push and backfill batch

## Important Public API / Interface / Type Changes

## 1. Module & Permissions
- Add new module IDs in `src/lib/modules.ts`:
  - `crm`
  - `sales` (transactional sales)
  - optional later: `cpq`, `sales-ops`
- Keep existing `/sales` route entry point, but gate tabs/actions by `crm:*` vs `sales:*` permissions.

## 2. New Canonical API Surface (same app, stable contracts)
Introduce normalized endpoints (internally backed by domain services):
- `/api/crm/pipelines`
- `/api/crm/leads`
- `/api/crm/leads/[id]`
- `/api/crm/opportunities`
- `/api/crm/opportunities/[id]`
- `/api/crm/activities`
- `/api/crm/tasks`
- `/api/crm/accounts`
- `/api/crm/contacts`
- `/api/sales/quotes`
- `/api/sales/quotes/[id]`
- `/api/sales/orders`
- `/api/sales/orders/[id]`
- `/api/sales/orders/[id]/approve`
- `/api/sales/orders/[id]/fulfillment`
- `/api/sales/pricelists`
- `/api/sales/settings`

Compatibility wrappers (temporary):
- existing `/api/sales/leads`, `/customers`, `/opportunities`, `/quotations`, `/orders` return normalized shapes and map old payloads.

## 3. Frontend Types (replace ad-hoc interfaces)
Create canonical shared types (single source):
- `src/apps/crm/types.ts`
- `src/apps/sales/types.ts` (refactor current)
- `src/lib/types/party.ts`
- `src/lib/types/branch.ts`

All pages/components must import these instead of duplicating local interfaces.

## 4. Data Model Additions (Prisma, additive)
Add canonical models (names can vary, but structure is fixed):
- `Party` (person/org root)
- `PartyOrganization`
- `PartyPerson`
- `PartyAddress`
- `PartyContactMethod`
- `CustomerAccount` (tenant-scoped commercial customer profile)
- `CustomerContactLink`
- `BusinessBranch` (generic branch for all modules)
- `CrmPipeline`
- `CrmStage`
- `CrmLead`
- `CrmLeadStageHistory`
- `CrmOpportunity`
- `CrmOpportunityStageHistory`
- `CrmActivity`
- `CrmTask`
- `CrmNote`
- `SalesQuote`
- `SalesQuoteLine`
- `SalesQuoteRevision`
- `SalesOrder`
- `SalesOrderLine`
- `SalesOrderApproval`
- `SalesFulfillmentRequest` (handoff to inventory/logistics)
- `SalesDocumentAttachment`
- `SalesAuditEvent`

Add linking fields (non-destructive) to existing legacy models:
- `Customer.partyId`
- `ExportCustomer.partyId`
- `POSOrder.branchId` (and customer account link if applicable)
- `SalesOrderLegacy` / `QuotationLegacy` mapping tables if needed

## Research-Informed Functional Standards (Applied to This ERP)

This plan intentionally adopts proven patterns from major systems:
- Microsoft Learn sales lifecycle: `Lead -> Opportunity -> Quote -> Order -> Invoice/Fulfill`
- HubSpot pipeline governance: stage rules, stage movement restrictions, approvals, required deal creation
- HubSpot stage analytics: time-in-stage / stage entry-exit tracking
- Odoo quotation-to-sales-order conversion, quote validity, order lock, online signature/payment options
- Odoo invoicing policies: `invoice ordered` vs `invoice delivered`, partial delivery/backorder support

These will be implemented as configurable ERP rules, not hardcoded UI-only behavior.

## Implementation Plan (Phased, Decision Complete)

## Phase 0: Baseline, Freeze, and Contract Inventory
- Freeze changes in current `sales` API/routes during rebuild window.
- Document current broken/missing contracts and map each UI call to actual route.
- Create ADRs (architecture decisions) for:
  - shared party master
  - multi-branch readiness
  - pipeline rules engine
  - quote/order approval model
  - additive `db push` migration policy
- Define canonical naming:
  - `Account` (company customer)
  - `Contact` (person)
  - `Lead`
  - `Opportunity`
  - `Quote`
  - `Sales Order`

Deliverables:
- API contract matrix
- field mapping matrix (legacy -> canonical)
- migration safety checklist

## Phase 1: Shared Party Master + Branch Foundation (Additive Schema)
- Add `Party` and related tables.
- Add `BusinessBranch` and branch ownership fields.
- Add `partyId` links to existing customer-like models.
- Backfill:
  - `Customer` -> `Party + CustomerAccount`
  - `ExportCustomer` -> `Party + module facet`
- Create dedupe rules:
  - exact email/phone + tenant
  - exact tax ID + tenant
  - manual review queue for fuzzy matches

Defaults:
- one default branch per tenant auto-created if none exists
- single legal entity per tenant in phase 1, branch-ready schema

## Phase 2: CRM Core (Pipelines, Leads, Opportunities, Activities)
- Build configurable CRM pipelines (`CrmPipeline`, `CrmStage`) with weighted probabilities.
- Implement pipeline rules (configurable per pipeline):
  - restrict stage skipping
  - restrict backward moves
  - stage-level edit restrictions
  - approval-required stages (configurable)
- Implement stage history + SLA tracking:
  - date entered/exited stage
  - current stage age
  - cumulative stage duration
- Build `activities/tasks/notes` timeline (calls, emails, meetings, follow-ups).
- Add ownership and assignment (`ownerUserId`, team/branch ownership).

UI deliverables:
- CRM board view (kanban)
- account/contact 360 page
- activity timeline + next action panel
- opportunity workspace with stage controls + approval gate UI

## Phase 3: Sales Core (Quote-to-Order, Line Items, Approvals)
- Introduce proper `Quote` and `QuoteLine`, `Order` and `OrderLine`.
- Add quote lifecycle:
  - draft
  - sent
  - approved by customer
  - expired
  - canceled
  - converted
- Add order lifecycle:
  - draft
  - pending approval
  - approved
  - confirmed
  - partially fulfilled
  - fulfilled
  - invoiced
  - closed/canceled
- Add quote revisions (immutable history per revision).
- Add quote validity, terms, payment terms, delivery terms, incoterms (optional field now, used by export workflows later).
- Add order approval rules:
  - discount threshold
  - margin threshold
  - credit limit breach
  - out-of-stock or backorder condition
  - high-risk customer/manual review

UI deliverables:
- quote builder with templates
- approval badges and routing UI
- order workspace with fulfillment/invoice status panels
- document preview/send log

## Phase 4: Pricing, Taxes, Credit, and Commercial Controls
- Implement price list framework:
  - branch-specific price lists
  - customer-specific pricing
  - currency support
  - effective dates
- Discount controls:
  - line vs header discount
  - max discount by role
  - reason codes required above threshold
- Tax engine integration layer:
  - tax inclusive/exclusive
  - branch/region default tax profiles
  - product tax category override
- Credit controls:
  - customer credit limit
  - overdue invoice hold
  - approval release workflow
- Deposit/prepayment support:
  - generic prepayment on quote/order (inspired by export wallet/deposit patterns)

## Phase 5: Operational Handoffs (Inventory, Accounting, Vehicle Export, POS/Restaurant)
- Inventory handoff:
  - reserve stock on order approval/confirmation (configurable)
  - partial fulfillment and backorder creation
- Accounting handoff:
  - create invoice draft request payloads (do not duplicate accounting logic)
  - track invoice status back on sales order
- Vehicle export integration:
  - map opportunity/quote/order to export request/bid/vehicle assignment flows
  - support incoterms, destination port, compliance checklist references
- Restaurant/POS integration:
  - use shared party/customer and branch model
  - keep POS orders lightweight but link to party/account when identified
  - remove JSON-table dependency for production restaurant floor/table ops in later hospitality plan

## Phase 6: API Hardening and Auth/Tenancy Standardization
- Replace `getOrCreateDefaultTenant()` in production sales/restaurant routes with authenticated tenant/session resolution.
- Standardize route handler patterns:
  - auth
  - tenant scoping
  - permission check
  - validation
  - error envelope
  - pagination/sorting/filtering format
- Add request validation (Zod) for all CRM/Sales endpoints.
- Add optimistic concurrency where needed (`updatedAt`/version token).
- Add audit events for stage changes, approvals, price overrides, deletions.

## Phase 7: UI/UX Upgrade (Reuse Best Existing Patterns, Avoid Demo Gaps)
Adopt the strongest patterns already present:
- From vehicle export:
  - domain-driven dashboards
  - workflow status strips
  - role-specific pages
  - clear internal/public API separation
- From restaurant:
  - responsive high-speed interactions
  - modern visual polish
  - live operational cards
- Do not copy restaurant’s persistence shortcuts (JSON route, simulated settings)

Sales/CRM UX standards:
- board + list + workspace views
- keyboard-friendly pipeline actions
- sticky right-rail “next actions”
- stage SLA timers and aging indicators
- approval banners with exact reason
- audit/event timeline on every key record
- consistent empty/loading/skeleton states

## Phase 8: Reporting, Forecasting, and Ops Controls (Operational Core+)
- Pipeline reports:
  - weighted pipeline
  - stage aging
  - conversion rates
  - forecast by owner/branch
- Sales execution reports:
  - quote-to-order conversion
  - approval turnaround
  - margin leakage
  - fulfillment lead time
  - invoice lag
- CRM productivity:
  - overdue follow-ups
  - activity SLA compliance
  - lead response times
- Add scheduled jobs for:
  - quote expiry
  - stale opportunity reminders
  - SLA breach notifications

## Phase 9: Cutover, Backward Compatibility, and Cleanup
- Switch all `/sales` UI pages to canonical CRM/Sales services.
- Keep compatibility wrappers for legacy endpoints for a defined deprecation window.
- Freeze writes to legacy tables or keep sync adapters until all screens are migrated.
- Produce migration verification report:
  - record counts
  - key totals
  - orphan checks
  - branch/party coverage
- Plan later cleanup phase (no destructive `db push` until data verified and backups archived).

## Acceptance Criteria (Business + Technical)

## Functional acceptance (must pass)
- Lead can be qualified into opportunity with stage history preserved.
- Opportunity can move through pipeline with configurable stage rules enforced.
- Quote can be created with line items, taxes, discounts, validity, terms.
- Quote can be revised and converted to order without losing revision history.
- Order supports partial fulfillment and backorder state.
- Order approval triggers on configured thresholds (discount/margin/credit).
- Customer/account and contact data are shared across modules via party master links.
- Multi-branch filters and ownership work consistently on CRM/Sales records.
- Audit trail exists for stage changes, approvals, and commercial overrides.

## Technical acceptance (must pass)
- All CRM/Sales routes are tenant-scoped and permission-checked.
- No JSON/file-based persistence for CRM/Sales production data.
- Canonical API responses are typed and consistent (pagination envelopes standardized).
- Legacy data backfill preserves record counts and key financial totals.
- No destructive schema changes executed during `db push` rollout phases.
- UI pages no longer rely on missing routes or mismatched payload fields.

## Test Cases and Scenarios

## Unit tests
- stage transition validator
- approval rule engine (discount/margin/credit)
- pricing resolution (branch/customer/price list precedence)
- tax calculation strategies
- quote->order conversion mapper
- stage duration calculator

## Integration tests (API + Prisma)
- create lead -> qualify -> opportunity
- opportunity stage move with restriction failure cases
- quote create/update/revise/convert
- order approval required vs auto-approve
- order partial fulfillment -> backorder state
- tenant isolation (cross-tenant access denied)
- branch filtering and ownership
- migration backfill scripts idempotency

## End-to-end scenarios
- B2B wholesale flow: lead -> opportunity -> quote -> approval -> order -> partial fulfillment -> invoice handoff
- Vehicle-export assisted sale: customer account -> opportunity -> quote with shipping fields -> order handoff
- Existing customer edit and duplicate prevention
- Quote expiry and reminder workflow
- Overdue follow-up SLA dashboard indicators

## Data migration verification tests
- legacy customer count mapped to party/customer account counts
- random sample record field parity checks
- no orphaned line items or stage history
- totals parity for quotes/orders (legacy vs canonical where applicable)

## Explicit Assumptions and Defaults (Chosen)

- `Mixed Generic ERP` means the first design is shared-core and configurable, not industry-hardcoded.
- `Operational Core` takes priority over AI/automation and advanced forecasting in phase 1.
- `Shared Party Master` is canonical; existing `Customer` and `ExportCustomer` are migrated/linked, not immediately dropped.
- `Multi-branch ready` is implemented now; `multi-company/legal entity` is deferred.
- `prisma db push` will be used only for additive, non-destructive schema evolution in this program.
- Backups/export snapshots are mandatory before every schema push/backfill batch.
- Existing `vehicle-export` and `restaurant` modules remain functional during sales/CRM rebuild; integrations are phased.
- Auth standardization will remove dev fallback patterns from production-critical CRM/Sales routes.

## Research Basis (Used to Shape This Plan)

- Microsoft Learn (updated 2025-06-18): standard sales lifecycle flow from lead to invoice/fulfillment, used as baseline for CRM->Sales process design.
  - https://learn.microsoft.com/en-us/dynamics365/sales/nurture-sales-from-lead-order-sales
- HubSpot Knowledge Base (updated 2026-01-27): pipeline design guidance, including when to create separate pipelines vs use permissions on one pipeline.
  - https://knowledge.hubspot.com/object-settings/set-up-and-customize-pipelines
- HubSpot Knowledge Base (updated 2025-12-08): pipeline rules (skip/backward restrictions, stage edit controls, approvals), used for stage governance design.
  - https://knowledge.hubspot.com/object-settings/set-up-pipeline-rules
- HubSpot Knowledge Base (updated 2026-02-11): stage calculated properties (time in stage / entry/exit timestamps), used for SLA and aging metrics design.
  - https://knowledge.hubspot.com/properties/stage-calculated-properties
- Odoo 19 Docs: quote -> sales order conversion, quote validity/templates, online signature/payment, lock confirmed sales, used for quote/order lifecycle features.
  - https://www.odoo.com/documentation/19.0/applications/sales/sales/sales_quotations/create_quotations.html
- Odoo 19 Docs: invoicing policies (`ordered` vs `delivered`), partial delivery/backorder implications, used for fulfillment/invoice handoff design.
  - https://www.odoo.com/documentation/19.0/applications/sales/sales/invoicing/invoicing_policy.html
