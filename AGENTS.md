<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — SLICT ERP (Repository Root)

> **Single source of truth for every agent working in this repo.**  
> Claude Code reads this natively; Antigravity/Gemini reads it through `GEMINI.md`, a symlink to this file.  
> Claude-only mechanisms (subagents, skills, slash commands) live in `CLAUDE.md`.  
> Everything below binds **both** agents equally.

---

## 🏛️ System Overview & Architecture

**SLICT ERP** is a multi-tenant enterprise resource planning SaaS platform supporting multiple vertical industries (Accounting, Sales & CRM, Inventory, Vehicle Export, Hospitality, Healthcare, POS, Manufacturing, and Projects).

### Core Technology Stack
| Layer | Technology | Key Constraints |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Request interception handled via `src/proxy.ts` (replaces legacy `middleware.ts`). |
| **Frontend** | React 19, Tailwind CSS, Radix UI | Server Actions & React Server Components. Client components use `'use client'`. |
| **Database** | PostgreSQL | Managed via Prisma 7 using the driver adapter pattern (`@prisma/adapter-pg`). |
| **Configuration** | `prisma.config.ts` | Centralized database connection and seed definitions. |
| **Authentication** | NextAuth v4 (JWT strategy) | Session validation with RBAC module permissions. |
| **Hosting** | Vercel Serverless / Docker | Read-only filesystem in serverless lambdas (`/var/task`). |

---

## 🚨 Non-Negotiable Security Guardrails (Strict Enforcement)

Following the forensic security audit of this codebase, **all agents must strictly enforce these rules without exception**:

1. **Zero Hardcoded Credentials:**
   * Never commit passwords, database connection strings with credentials, API keys, or session tokens into source code, scripts, seed files, or `docker-compose.yml`.
   * All secrets must be loaded via `process.env`.
   * Never commit live cookie dumps (`cookies.txt`), test credentials, or shell output spills (`s`, `findstr`, `git`, `type`).

2. **Strict Multi-Tenant Isolation:**
   * **FORBIDDEN:** Never use `getOrCreateDefaultTenant()` or client-supplied `x-tenant-id` headers for authorization or data filtering in production route handlers.
   * **MANDATORY:** Always resolve tenant context from the verified server session:
     ```typescript
     const session = await getServerSession(authOptions);
     if (!session?.user?.tenantId) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }
     const tenantId = session.user.tenantId;
     ```
   * All database queries must explicitly scope where clauses by `tenantId`.

3. **Serverless Filesystem Safety:**
   * **FORBIDDEN:** Never use `fs.writeFileSync`, `fs.writeFile`, or local file modifications inside route handlers or server actions. In Vercel / serverless runtime, the filesystem is read-only and will throw `EROFS` errors.
   * Store persistent state in PostgreSQL via Prisma, and media in Cloudinary/S3.

4. **Fail-Closed Authorization:**
   * Cron endpoints and webhook handlers must strictly fail closed:
     ```typescript
     if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }
     ```
   * Webhook handlers (Facebook, WhatsApp, Aramex, DHL) must cryptographically verify incoming HMAC signatures before dispatching jobs.

5. **No Raw SQL Without Parameterization:**
   * Prohibit unvalidated string interpolation inside `prisma.$queryRawUnsafe`.
   * Parameterize all queries or use tagged templates (`prisma.$queryRaw`...``).

6. **Error Sanitization & Info Leakage:**
   * Never return `error.message` directly from Prisma/PostgreSQL to HTTP clients. Mask errors with sanitized client-safe responses.
   * Never leak call stack traces (`error.stack` or `rawError: error.stack`) in API responses.

7. **Real Payment Processing:**
   * Never simulate payments with client-side mock timers (`setTimeout`).
   * Implement real server-side checkout sessions (Stripe/PayPal) and handle fulfillment strictly through verified webhooks.

8. **Never Write a Secret's Value — Not Even to Describe a Leak:**
   * Give its location (`prisma/create-superadmin.ts:10`), never the value. Commit `111d841` quoted
     leaked passwords while documenting them and had to be redacted. Scanners cannot catch a
     password written into a sentence.

---

## 📚 Verified Domain Rules (Never Violate)

Details, sources and open questions: [`docs/knowledge/`](docs/knowledge/README.md). A fact marked
**Secondary** or **Unresolved** there is not a rule. Confirm it before building on it.

* **VAT tax invoices** follow Gazette 2481/22 from **1 October 2026** (Gazette 2500/106). Serial
  `YYMMM_QQQQ_XXXXX`, sequential per tenant and code, **never reset monthly**, numbered inside the
  invoice's own transaction. Gazette 2463/05 is superseded.
* **Money** is `Decimal` or integer minor units, never `Float`.
* **Tax dates** are computed in **Asia/Colombo**, never server time (UTC).
* **Tax and statutory calculations** (VAT, SSCL, APIT, EPF, ETF, gratuity) need a chartered
  accountant's sign-off before they ship.
* **Personal data** never goes into logs, Lark, test fixtures or cloud AI calls. Use synthetic data.

---

## 👥 Team & Where Things Live

| Person | Role | Decides |
| --- | --- | --- |
| Mr. Mubasshir | Owner, product & engineering | What merges into `ERP.SLICT.LK`, production, architecture |
| Mr. Umair | DevOps principal & engineer | Infrastructure, CI, branch-level implementation |
| Mr. Haneek | IT & marketing support | Raises issues; campaigns and customer discovery |

| What | Where |
| --- | --- |
| Conversation, issue intake, non-code approvals | Lark (no passwords and no customer personal data) |
| Branches, pull requests, CI | Staging repo `umairmsm/slicterp`. **Push every branch here**: it is the backup and the review venue |
| The owner's code | `slict-lk/erp`. Only Mr. Mubasshir merges |
| Findings, decisions, research, operations | Project record `umairmsm/slict-pm` (moving to `slict-lk`) |
| Domain facts for agents | [`docs/knowledge/`](docs/knowledge/README.md) |

---

## 🤝 Working Together (Claude Code ⇄ Antigravity)

1. **Division of Labor:**
   * **Antigravity (System Architect & GitHub Ops):** High-level audits, schema integrity analysis, GitHub PRs, issues, repository permissions, and cross-agent review.
   * **Claude Code (Terminal Implementation Engine):** Interactive code refactoring, function implementations, local test execution, and terminal-level debugging.
2. **Branching Convention:**
   * Claude Code branches: `claude/<topic>` (e.g. `claude/fix-auth-rate-limit`).
   * Antigravity branches: `ag/<topic>` (e.g. `ag/audit-phase1-security`).
   * Feature/Fix branches for PRs: `fix/<topic>` or `feat/<topic>`.
   * **Never commit directly to `master` or `ERP.SLICT.LK` without review.**
3. **State & Memory Synchronization:**
   * Project status, findings and decisions live in the project record, `umairmsm/slict-pm`.
   * The Phase 1 checklist is [`docs/AUDIT_TASK_TRACKER.md`](docs/AUDIT_TASK_TRACKER.md).
   * If a document disagrees with the code, **trust the code** and correct the document.
4. **Approval Gate:**
   * Anything touching **production deployments, financial/payment flows, destructive database migrations, or security secrets** requires explicit human confirmation from Umair / Mubasshir.
   * Only Mr. Mubasshir merges into `ERP.SLICT.LK`. Agents never push to `slict-lk/*`.
5. **Issue Lifecycle:** Mr. Haneek reports in Lark (`ISS-nnnn`) → Umair triages → an agent audits
   with `file:line` evidence on a GitHub issue → fix on `claude/iss-nnnn-<slug>` → Mr. Mubasshir
   approves the pull request → migrate, then deploy → the Lark record is closed with links.
6. **Verify Before Pushing:** run `pnpm verify` (PR #3) and paste `.verify/report.md` into the
   pull request, followed by `/security-review`, `/code-review` and the other agent's second opinion.
7. **Release Order:** apply migrations to production **before** deploying code that needs them.
   Builds do not run migrations.

---

## 📋 PM Contract

The project record is `umairmsm/slict-pm`: findings, fixes, research, decisions, the roadmap and
operations (backup and disaster recovery, release process). [`PROJECT.md`](PROJECT.md) summarises
it for agents; bump its `updated` field whenever the record changes.
