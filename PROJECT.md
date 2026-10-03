---
project: slict-erp
domain: enterprise
repo: slict-lk/erp
path: workspace/slitc
status: active
health: amber
owner: Umair / Mubasshir
priority: P0
goal: "Harden security, enforce strict multi-tenant isolation, eliminate hardcoded credentials/backdoors, and prepare SLICT ERP for enterprise SaaS production deployment."
metric: "0 P0 vulnerabilities, 100% tenant isolation across 450+ routes, 0 serverless crashes, passing CI suite."
revenue_impact: critical
effort: high
production: "Vercel Serverless (Frontend/API) + Aiven Managed PostgreSQL 16 (Prisma 7). Domain: erp.slict.lk"
next_action: "VAT tax invoice format is mandatory from 1 Oct 2026: review draft PR #2. Squash-merge PR #1 and rotate the leaked credentials. Enable GitHub Team rules on slict-lk. Confirm the Aiven plan and backups."
blockers:
  - "VAT tax invoice format mandatory 1 Oct 2026 (Gazette 2481/22, date set by 2500/106): fix in draft PR #2, awaiting review"
  - "Leaked SuperAdmin and database credentials not yet rotated (repository was public until 20 Sep 2026)"
  - "No branch protection on slict-lk/erp: GitHub Free does not enforce rules on private repos"
  - "Backups and disaster recovery undocumented; Aiven plan (and so backup retention) unknown"
  - "Phase 1 security fixes (auth backdoors, fail-open gates, hardcoded secrets) are in PR #1, not yet merged"
  - "Multi-tenancy: 474 getOrCreateDefaultTenant() calls; spoofable x-tenant-id header in 21 files"
  - "Serverless crash hazard: fs.writeFileSync in restaurant/tables/route.ts"
  - "Payments simulated: MockStripe in marketplace checkout"
confidence: confirmed
updated: 2026-09-29
docs:
  - AGENTS.md
  - CLAUDE.md
  - GEMINI.md
  - docs/AUDIT_TASK_TRACKER.md
  - docs/knowledge/README.md
  - docs/MULTI_TENANCY_GUIDE.md
  - docs/VEHICLE_EXPORT_MODULE.md
---

# SLICT ERP — Master Project Management State

> Summary for agents. The full record (findings, fixes, research, decisions, operations) is the
> private repository `umairmsm/slict-pm`, moving to `slict-lk` once Mr. Mubasshir accepts it.

Canonical PM contract per workspace agent conventions. This is the single canonical reference file for all AI agents (Claude Code & Antigravity) and human engineers working on the **SLICT ERP** ecosystem.

---

## 📍 System Health & Current Status

* **Repository State:** 🔒 **PRIVATE** (Changed from Public on 2026-09-20).
* **Primary Branch:** `ERP.SLICT.LK` (Default).
* **Current Health:** **AMBER** (Codebase functional but gated by security and multi-tenancy remediation).
* **Target Audience:** Multi-tenant enterprise clients across automotive export, spare parts, accounting, hospitality, healthcare, and retail POS.

---

## 📜 Timeline & Context Baseline

### ⏪ WHERE WE WERE (QA Report Baseline — 2026-08-05)
* Initial QA test report recorded 75 passed / 29 failed (72.1% pass rate).
* 29 failures were attributed to 19 missing API endpoints.
* Assumed production-ready based on local HTTP 200 checks.

### 📍 WHERE WE ARE NOW (Forensic Second Opinion Audit — 2026-09-21)
* Identified that commit `b13282d` added the 19 missing routes without authentication or schema validation.
* Identified 7 Critical (P0) security vulnerabilities:
  1. Plaintext SuperAdmin credentials (`mubasshir@slict.lk` / `[REDACTED — rotated credential]`) in `create-superadmin.ts` and `qa-test-suite.mjs`.
  2. Database password (`admin:[REDACTED — rotated credential]`) in `docker-compose.yml`.
  3. Active JWE session tokens in `cookies.txt`.
  4. Demo account backdoor in `src/lib/auth-options.ts`.
  5. Fail-open authorization in `src/app/api/cron/*` and `src/app/api/public/export/*`.
  6. AI chatbot SQL injection vector via unparameterized `$queryRawUnsafe` with missing `UNION` filtering.
  7. Client call stack leak in `src/app/api/crm/opportunities/route.ts`.
* Identified pervasive multi-tenancy leak: 450+ API route calls use `getOrCreateDefaultTenant()`, causing cross-tenant data contamination.
* Identified serverless deployment blocker: `fs.writeFileSync` in `src/app/api/restaurant/tables/route.ts`.
* Identified payment gap: Marketplace checkout runs a fake `setTimeout` (MockStripe) without real gateway execution.

---

## 🎯 Phased Remediation Roadmap

```mermaid
gantt
    title SLICT ERP Remediation Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1: Security Lockdown
    Sanitize passwords & delete cookies.txt    :crit, p1_1, 2026-09-21, 1d
    Remove auth backdoors (demo & dev fallback) :crit, p1_2, 2026-09-21, 1d
    Fix fail-open cron & public API auth      :crit, p1_3, 2026-09-22, 1d
    Secure /api/admin/tenants route           :crit, p1_4, 2026-09-22, 1d
    section Phase 2: Runtime & Serverless
    Migrate tables.json to Prisma model       :p2_1, 2026-09-23, 2d
    Fix CORS headers in vercel.json           :p2_2, 2026-09-24, 1d
    Implement missing check-low-stock cron     :p2_3, 2026-09-25, 1d
    Mask raw database errors (340+ routes)    :p2_4, 2026-09-26, 3d
    section Phase 3: Multi-Tenancy Core
    Refactor getOrCreateDefaultTenant to session :p3_1, 2026-09-28, 5d
    Remove spoofable x-tenant-id headers      :p3_2, 2026-10-01, 3d
    section Phase 4: Commercial Payments
    Build real Stripe/PayPal checkout         :p4_1, 2026-10-04, 4d
    Enforce cryptographic webhook validation  :p4_2, 2026-10-07, 2d
```

---

## 👥 Dual-Agent Sprints & Task Ownership

| Task | Owner Agent | Branch | Status |
|---|---|---|---|
| Remove `cookies.txt`, `s`, and shell spills | Antigravity | `ag/phase1-hygiene` | ⏳ Ready |
| Sanitize passwords in `create-superadmin.ts` & `docker-compose.yml` | Claude Code | `claude/sanitize-secrets` | ⏳ Ready |
| Remove demo account bypass in `auth-options.ts` | Claude Code | `claude/auth-hardening` | ⏳ Ready |
| Fix fail-open check in `api/cron/*` & `export/*` | Claude Code | `claude/auth-hardening` | ⏳ Ready |
| Protect `api/admin/tenants` behind `isSuperAdmin` | Claude Code | `claude/auth-hardening` | ⏳ Ready |
| Migrate `restaurant/tables` from JSON to Prisma | Claude Code | `claude/serverless-compat` | 📋 Queued |
| Fix CORS conflict in `vercel.json` | Antigravity | `ag/vercel-config` | 📋 Queued |
| Refactor 450+ APIs from `getOrCreateDefaultTenant` to session | Joint / Paired | `fix/multi-tenancy-core` | 📋 Queued |
| Real Stripe / PayPal checkout & webhook signature verification | Joint / Paired | `feat/payment-gateway` | 📋 Queued |
| PR Reviews, Git Verification & Releases | Antigravity | Review Gate | 🛡️ Active |

---

## 📋 Conventions & Rules

1. **One Fact, One Home:** High-level sprint state stays in this file (`PROJECT.md`). Granular line-level checklists stay in `docs/AUDIT_TASK_TRACKER.md`.
2. **Branching:** Claude Code works on `claude/<feature>`, Antigravity works on `ag/<feature>`.
3. **Approval Gate:** Any destructive migration, credential reset, or production deployment requires human approval from Umair / Mubasshir.
