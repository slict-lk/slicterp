CREATE TYPE "ProjectBillingType" AS ENUM ('INTERNAL', 'TIME_AND_MATERIALS', 'FIXED_MILESTONE');

ALTER TABLE "Project"
  ADD COLUMN "billingType" "ProjectBillingType" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN "defaultBillingRate" DECIMAL(18,2),
  ADD COLUMN "defaultCostRate" DECIMAL(18,2);

ALTER TABLE "Task"
  ADD COLUMN "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "acceptanceCriteria" TEXT;

ALTER TABLE "Timesheet"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedById" TEXT,
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "billingBatchId" TEXT;

ALTER TABLE "ProjectTemplate" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ProjectWorkflowStatus"
  ADD COLUMN "allowedTransitions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ProjectMilestone"
  ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "billableAmount" DECIMAL(18,2),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ProjectSprint" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "TaskWatcher" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "taskId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskWatcher_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectActivity" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "projectId" TEXT NOT NULL, "actorId" TEXT,
  "action" TEXT NOT NULL, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectSavedView" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "projectId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL, "viewType" TEXT NOT NULL, "filters" JSONB NOT NULL, "isShared" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectSavedView_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectBillingBatch" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "projectId" TEXT NOT NULL, "invoiceId" TEXT,
  "idempotencyKey" TEXT NOT NULL, "billingType" "ProjectBillingType" NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "amount" DECIMAL(18,2) NOT NULL, "currency" TEXT NOT NULL, "sourceIds" JSONB NOT NULL, "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectBillingBatch_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectNotificationOutbox" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "recipientId" TEXT NOT NULL, "eventType" TEXT NOT NULL,
  "title" TEXT NOT NULL, "message" TEXT NOT NULL, "link" TEXT, "payload" JSONB, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0, "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3), "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectNotificationOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskWatcher_taskId_userId_key" ON "TaskWatcher"("taskId", "userId");
CREATE INDEX "TaskWatcher_tenantId_userId_idx" ON "TaskWatcher"("tenantId", "userId");
CREATE INDEX "ProjectActivity_tenantId_projectId_createdAt_idx" ON "ProjectActivity"("tenantId", "projectId", "createdAt");
CREATE UNIQUE INDEX "ProjectSavedView_projectId_ownerId_name_key" ON "ProjectSavedView"("projectId", "ownerId", "name");
CREATE INDEX "ProjectSavedView_tenantId_ownerId_idx" ON "ProjectSavedView"("tenantId", "ownerId");
CREATE UNIQUE INDEX "ProjectBillingBatch_tenantId_idempotencyKey_key" ON "ProjectBillingBatch"("tenantId", "idempotencyKey");
CREATE INDEX "ProjectBillingBatch_tenantId_projectId_idx" ON "ProjectBillingBatch"("tenantId", "projectId");
CREATE INDEX "ProjectBillingBatch_tenantId_invoiceId_idx" ON "ProjectBillingBatch"("tenantId", "invoiceId");
CREATE INDEX "ProjectNotificationOutbox_tenantId_status_availableAt_idx" ON "ProjectNotificationOutbox"("tenantId", "status", "availableAt");
CREATE INDEX "ProjectNotificationOutbox_recipientId_status_idx" ON "ProjectNotificationOutbox"("recipientId", "status");

ALTER TABLE "TaskWatcher" ADD CONSTRAINT "TaskWatcher_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectSavedView" ADD CONSTRAINT "ProjectSavedView_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBillingBatch" ADD CONSTRAINT "ProjectBillingBatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "ProjectWorkflowStatus"
SET "allowedTransitions" = CASE
  WHEN "category" = 'TODO' THEN ARRAY['IN_PROGRESS', 'CANCELLED']
  WHEN "category" = 'IN_PROGRESS' THEN ARRAY['TODO', 'REVIEW', 'DONE', 'CANCELLED']
  WHEN "category" = 'REVIEW' THEN ARRAY['IN_PROGRESS', 'DONE', 'CANCELLED']
  WHEN "category" = 'DONE' THEN ARRAY['IN_PROGRESS']
  ELSE ARRAY[]::TEXT[]
END;
