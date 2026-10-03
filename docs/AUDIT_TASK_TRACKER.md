# SLICT ERP — Audit Remediation Task Tracker

**Master Tracker:** Synchronized between Claude Code and Antigravity.  
**Reference Constitution:** [`AGENTS.md`](file:///media/umair/DataDrive/workspace/slitc/AGENTS.md)  
**PM State:** [`PROJECT.md`](file:///media/umair/DataDrive/workspace/slitc/PROJECT.md)  
**Updated:** 2026-09-21. From 29 September, status is kept in the project record, `umairmsm/slict-pm`.  

---

## 🔴 Phase 1: Security Lockdown & Git Hygiene (Immediate / Day 1)

> **Phase 1 status (2026-09-21, branch `claude/security-cleanup`):** items below marked `[x]`
> are done and verified. Two findings were added during Claude Code's second-opinion audit —
> see `1.5`. Credential rotation (`1.6`) is **still open** and requires human action.

### 1.1 Remove Committed Secrets & Junk Files
- [x] Delete `cookies.txt` (contains active session token).
- [x] Delete `s` (contains internal git config with email and Windows paths).
- [x] Delete `findstr`, `git`, `type` (empty command output dump files).
- [x] Delete `buildtrigger.txt` and `build_log.txt`.
- [x] Update `.gitignore` to include:
  ```gitignore
  .env*
  !.env*.example
  cookies.txt
  build_log.txt
  ```

### 1.2 Sanitize Hardcoded Plaintext Credentials
- [x] **`prisma/create-superadmin.ts`:**
  - Replace hardcoded `mubasshir@slict.lk` and `[REDACTED — rotated credential]` with `process.env.INITIAL_SUPERADMIN_EMAIL` and `process.env.INITIAL_SUPERADMIN_PASSWORD`.
- [x] **`docker-compose.yml`:**
  - Replace `DATABASE_URL=postgresql://admin:[REDACTED — rotated credential]@...` with environment variable interpolation `${DATABASE_URL}`.
- [x] **`qa-test-suite.mjs`:**
  - Replace hardcoded credentials with `process.env.TEST_USER_EMAIL` and `process.env.TEST_USER_PASSWORD`.
- [x] **`src/app/api/auth/register/route.ts`:**
  - Replace hardcoded `SUPER_ADMIN_EMAIL = 'mubasshir@slict.lk'` with `process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SUPER_ADMIN_EMAIL`.

### 1.3 Close Authentication Backdoors
- [x] **`src/lib/auth-options.ts` (L28–63):**
  - Remove the `demo@slict.lk` / `demo@slict` bypass that circumvents `bcrypt.compare`.
- [x] **`src/lib/auth.ts` (L21–40):**
  - Remove the `NODE_ENV === 'development'` auto-superadmin escalation in `getCurrentUser()`.
- [x] **`src/app/api/public/spareparts/*`:**
  - Remove insecure fallback secrets (`|| 'secret'` and `|| 'your-secret-key'`). Fail immediately if `NEXTAUTH_SECRET` is unset.
  - Enforce `algorithms: ['HS256']` in `jwt.verify()`.

### 1.4 Fix Fail-Open Cron & Public API Authorization
- [x] **`src/app/api/cron/trial-notifications/route.ts` (L21–25):**
  - Change `if (cronSecret && authHeader !== ...)` to `if (!cronSecret || authHeader !== ...)`.
- [x] **`src/app/api/cron/intelligence/route.ts` (L9–13):**
  - Change `if (cronSecret && authHeader !== ...)` to `if (!cronSecret || authHeader !== ...)`.
- [x] **`src/app/api/public/export/customer/password/route.ts` (L37–42):**
  - Enforce that `currentPassword` is strictly required for password changes.
- [x] **`src/app/api/public/export/customer/*`:**
  - Change `if (process.env.PUBLIC_API_KEY && authHeader !== ...)` to `if (!process.env.PUBLIC_API_KEY || authHeader !== ...)`.
- [x] **`src/app/api/admin/tenants/route.ts`:**
  - Protect `GET` and `POST` handlers behind `getServerSession(authOptions)` and verify `token.isSuperAdmin`.

### 1.5 Findings Added by Second-Opinion Audit
- [x] **`src/app/api/public/seed-vehicles/route.ts`:** deleted. Was an anonymous `GET` with zero
  auth that wrote `ExportVehicle` rows into the live `slict` tenant with `isPublished: true`.
- [x] **`src/lib/ai/erp-tasks.ts` (L433):** added `union|intersect|except` to `FORBIDDEN_KEYWORDS`.
  The tenant-scope check only asserts `$TENANT_ID` appears somewhere in the statement, so a
  second set-op arm ran unscoped and could read across tenants.

### 1.6 Credential Rotation — ⚠️ OPEN, REQUIRES HUMAN ACTION
Deleting the files above removes them from `HEAD`, **not from git history**. The repo was public
until 2026-09-20, so every value below must be treated as compromised regardless of tree state.
- [ ] Rotate SuperAdmin password for `mubasshir@slict.lk`.
- [ ] Rotate the Aiven PostgreSQL password (and the local Docker one).
- [ ] Rotate `NEXTAUTH_SECRET` — this is the only thing that invalidates the session token
      that was committed in `cookies.txt`.
- [ ] Rotate `PUBLIC_API_KEY` and `CRON_SECRET`.
- [ ] Decide whether to purge history (`git filter-repo`) — destructive, needs Umair/Mubasshir sign-off.

---

## 🟡 Phase 2: Runtime Stability & Cloud Deployment (Week 1)

### 2.1 Fix Serverless Crash Blockers
- [ ] **`src/app/api/restaurant/tables/route.ts`:**
  - Remove `fs.writeFileSync` to local `tables.json`.
  - Migrate table storage to a database model (`RestaurantTable`) in Prisma schema.
- [ ] **`vercel.json`:**
  - Fix invalid CORS: Remove wildcard `Access-Control-Allow-Origin: *` when `Access-Control-Allow-Credentials` is `true`.
  - Fix broken cron definition: Either create `src/app/api/cron/check-low-stock/route.ts` or remove the dead cron entry.
- [ ] **`next.config.mjs`:**
  - Remove `typescript: { ignoreBuildErrors: true }` and fix any actual compilation errors.
  - Remove wildcard image pattern `hostname: '**'` or constrain to approved domains.

### 2.2 Error Sanitization & Information Masking
- [x] **`src/app/api/crm/opportunities/route.ts` (L152–158):**
  - Remove `rawError: error.stack` from the client response.
- [ ] **`src/app/api/db-diagnostics/route.ts`:**
  - Require `isSuperAdmin` authorization or remove the route before production release.
- [ ] **Global Error Sanitization:**
  - Audit the 340+ API routes returning `{ error: error.message }` and wrap database calls in sanitized error handlers.

---

## 🔵 Phase 3: Multi-Tenancy Core Architecture (Week 2)

### 3.1 Refactor Default Tenant Calls
- [ ] Audit all 450+ occurrences of `getOrCreateDefaultTenant()`.
- [ ] Standardize API routes to extract tenant context strictly via:
  ```typescript
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  ```
- [ ] Audit routes relying on client-supplied `req.headers.get('x-tenant-id')` (e.g. `contacts`, `events`, `surveys`, `blog`, `calendar`) and replace with server session `tenantId`.

### 3.2 Schema & Orphan Record Hardening
- [ ] Add explicit foreign key relations between `Tenant` and event tables (`OperationalEvent`, `EmployeeCapacitySnapshot`, `TocConstraint`).
- [ ] Audit relations missing `onDelete` to prevent foreign key constraint crashes on cascading deletes.

---

## 🟢 Phase 4: Commercial Readiness & Payment Processing (Week 3)

### 4.1 Real Payment Gateway Integration
- [ ] Replace `MockStripe` (`setTimeout`) in `src/app/(dashboard)/marketplace/page.tsx` with real Stripe Checkout Sessions or Stripe Elements.
- [ ] Implement server-side Stripe webhook handler (`/api/webhooks/stripe`) with cryptographic signature verification (`stripe.webhooks.constructEvent`).

### 4.2 Webhook Signature Enforcement
- [ ] **`src/app/api/integrations/webhook/route.ts`:**
  - Enforce HMAC signature verification for incoming platform webhooks (Facebook, WhatsApp, Aramex, DHL).
