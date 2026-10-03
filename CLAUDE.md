@AGENTS.md

# CLAUDE.md — Claude Code Instructions for SLICT ERP

> This file contains Claude Code-specific operating instructions, subagents, and development commands.  
> The master constitution that governs all rules is in [`AGENTS.md`](./AGENTS.md).  
> The canonical project management state is in [`PROJECT.md`](./PROJECT.md).  
> The active sprint task checklist is in [`docs/AUDIT_TASK_TRACKER.md`](./docs/AUDIT_TASK_TRACKER.md).

---

## 🛠️ Common Commands

```bash
# Development server (Next.js 16 App Router)
pnpm run dev

# Database (Prisma 7 with PostgreSQL adapter)
pnpm run db:generate    # Generate Prisma client
pnpm run db:push        # Push schema changes (non-destructive)
pnpm run db:migrate     # Run migrations (development)
pnpm exec prisma validate # Validate schema and prisma.config.ts

# Quality & Verification
pnpm run type-check     # TypeScript compiler check (heap 4GB)
pnpm run lint           # ESLint
pnpm run test           # Jest unit tests
pnpm run test:watch     # Jest in watch mode
pnpm run test:qa        # Automated QA test suite

# Production Build
pnpm run build          # Production Next.js build
```

---

## 🤖 Available Subagents (~/.claude/agents/)

This environment has the global `agent-team` symlinked into `~/.claude/agents/`. When performing tasks, you can delegate to or take inspiration from these specialized roles:

| Subagent | Role in this Project |
|---|---|
| `gsd-security-auditor` | Security reviews of route handlers, auth logic, and secrets handling |
| `gsd-code-fixer` | Focused, high-precision code refactoring and bug fixes |
| `gsd-code-reviewer` | Code review before branch merges |
| `gsd-debugger` | Diagnosing Next.js 16 runtime and Prisma 7 database pool issues |
| `gsd-planner` | Architectural planning for complex module additions |
| `qa-test-engineer` | Writing Jest unit tests and integration tests for API routes |

---

## 🚨 Critical Development Rules for Claude Code

1. **Check `docs/AUDIT_TASK_TRACKER.md` First:**
   * Pick tasks from the tracker. Mark tasks `[x]` when completed.
2. **Branch Before Modifying Code:**
   * Always create and work on `claude/<topic>` branches (e.g. `git checkout -b claude/sanitize-secrets`).
   * Never commit directly to `master` or `ERP.SLICT.LK`.
3. **Never Hardcode Secrets:**
   * Always use `process.env.<VAR_NAME>`. Never leave fallback defaults like `|| 'secret'` or `|| 'password'`.
4. **Enforce Multi-Tenancy:**
   * Never use `getOrCreateDefaultTenant()` in new or refactored API routes. Always resolve from `session.user.tenantId`.
5. **No Local File Writes in APIs:**
   * Never write to local files via `fs.writeFileSync` inside `src/app/api/`. Serverless lambdas have read-only filesystems.
6. **Verify Before Declaring Done:**
   * Run `pnpm verify` (PR #3; see `docs/LOCAL_VERIFICATION.md`) and paste `.verify/report.md` into the pull request.
   * Until PR #3 is merged, at minimum run `pnpm run type-check` and `TZ=UTC pnpm test`.
7. **Check `docs/knowledge/` Before Touching Tax, Payments or Personal Data:**
   * Follow facts marked **Verified**; confirm **Secondary** ones; never implement **Unresolved** ones.
