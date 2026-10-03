# Coolify Deployment Notes

## Scope

This branch prepares the existing Next.js ERP app for containerized deployment on Coolify without changing production infrastructure, running Prisma migrations, or replacing the in-memory queue.

## Cron Configuration

- `vercel.json` currently defines one cron job:
  - Path: `/api/integrations/cron/sync`
  - Schedule: `0 0 * * *`
- The route in `vercel.json` is handled with `GET`.
- The repository already had a user-facing sync route at `src/app/api/integrations/sync/route.ts`.
- This branch adds the configured cron route at `src/app/api/integrations/cron/sync/route.ts`.
- Both the session route and the cron route now share the same synchronization/status handler in `src/lib/integrations/sync-management.ts`.
- Authorization behavior for the cron route:
  - Existing authenticated user-session access is allowed.
  - `Authorization: Bearer ${CRON_SECRET}` is also allowed.
  - Invalid requests return HTTP `401`.
  - Missing authorization returns HTTP `401`.
  - Incorrect authorization returns HTTP `401`.
  - Secret values are never logged or returned.

## Docker Build Inputs

- Docker image builds do not accept private runtime secrets as build arguments.
- The Dockerfile uses internal build-only placeholder values for:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - `CRON_SECRET`
- These placeholders are nonfunctional and are only there so `pnpm prisma generate` and `pnpm build` can run without production or staging secrets.
- The normal local image build command is:
  - `docker build --progress=plain -t slict-erp-coolify-test .`
- No private build arguments are required for the normal build.
- If a future `NEXT_PUBLIC_*` build argument is ever added, it must be treated as public and immutable because `NEXT_PUBLIC_*` values are embedded into the built application at `next build` time.

## Font Build Behavior

- The application font behavior was restored to the original `Inter` Google font import in `src/app/layout.tsx`.
- This preserves the existing visual appearance.
- Coolify and Docker builds therefore need outbound internet access during `next build` so Next.js can fetch the Google font asset.

## In-Memory Queue Call Sites

### Queue implementation

- `src/lib/jobs/queue.ts`
  - `integration_sync`
  - Runs every 15 minutes.
  - Also fires once 30 seconds after startup.
  - Queued work:
    - Sync active integration accounts for supported platforms:
      - `FACEBOOK_MARKETPLACE`
      - `WHATSAPP_BUSINESS`
      - `ARAMEX`
      - `DHL`
      - `DOMEX`
      - `IKMAN_LK`

- `src/lib/jobs/queue.ts`
  - `cleanup_logs`
  - Runs every 24 hours.
  - Also fires once 60 seconds after startup.
  - Queued work:
    - Deletes older `integrationLog` rows with `SUCCESS` or `PENDING` status.

- `src/lib/jobs/queue.ts`
  - `ai_control_plane`
  - Runs every 60 seconds.
  - Also fires once 15 seconds after startup.
  - Queued work:
    - Calls `processAllTenantAutomationQueues()` for AI workflow queues.

### Queue startup and control call sites

- `src/lib/jobs/queue.ts`
  - Auto-starts the queue in development after 10 seconds.

- `src/lib/jobs/manager.ts`
  - Starts `jobQueue` through `BackgroundJobManager`.
  - Auto-starts in development when `JOB_QUEUE_ENABLED !== 'false'`.
  - Auto-starts in production when `JOB_QUEUE_ENABLED !== 'false'`.

- `src/app/api/integrations/sync/route.ts`
  - Manual control endpoint for:
    - `start_queue`
    - `stop_queue`
    - `sync_all`
    - single `integrationId` sync trigger
    - queue status inspection

## Queue Risks

- What jobs are queued:
  - integration sync jobs
  - integration log cleanup
  - AI control-plane workflow queue processing

- What is lost during a restart:
  - All active `setInterval` and `setTimeout` schedules in memory
  - Any near-term run that had not fired yet
  - The queue manager's `isRunning` and `jobs` in-memory state

- Whether duplicate processing is possible:
  - Yes
  - Each replica creates its own timers in memory
  - A restart near the initial delayed triggers can re-run the "first" scheduled execution
  - Manual `/api/integrations/sync` triggers can overlap with scheduled timers
  - Manual `/api/integrations/cron/sync` triggers can overlap scheduled timers too
  - Nothing in the in-memory scheduler coordinates across processes

- Why the initial Coolify deployment must use one application replica:
  - Multiple replicas would each start their own in-memory queue manager
  - That would multiply scheduled integration syncs, cleanup jobs, and AI queue polling
  - Because no distributed lock or shared queue exists yet, one replica is the only safe initial topology

## Maintenance Mode Check

- No global maintenance mode or write-freeze switch was found during this branch inspection.
- No existing middleware-based write block, application-wide read-only flag, or maintenance gate was identified.

## Safe Production Write Freeze For Final Database Migration

Until a real maintenance mode exists, the safer production approach is operational rather than code-driven:

- Scale the Coolify app down to one replica before final migration work.
- Temporarily stop external traffic at the edge or load balancer so users cannot submit writes.
- Disable cron execution for the cutover window.
- Set `JOB_QUEUE_ENABLED=false` during the migration window so in-memory scheduled jobs do not create writes.
- Run the final migration only after confirming no active user traffic and no background writes are still running.
- Bring the app back only after migration success and application health verification.

## Allowed Origins

- `src/middleware.ts` contains the current public API `allowedOrigins` list.
- This branch does not change `allowedOrigins`.
- No proof was found in this inspection that `https://erp-new.slict.lk` is required for this Coolify preparation work itself.
