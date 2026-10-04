-- Additive, data-preserving expansion of Projects into Work Management.
CREATE TYPE "ProjectVisibility" AS ENUM ('PRIVATE', 'TENANT');
CREATE TYPE "ProjectMemberRole" AS ENUM ('MANAGER', 'CONTRIBUTOR', 'VIEWER', 'TIME_APPROVER');
CREATE TYPE "WorkflowStatusCategory" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED');
CREATE TYPE "SprintStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "WorkItemType" AS ENUM ('TASK', 'TODO', 'BUG', 'ISSUE', 'FEATURE', 'REQUEST', 'RISK', 'APPROVAL');
CREATE TYPE "WorkItemSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_code_key";
ALTER TABLE "Project"
  ADD COLUMN "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "templateKey" TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN "templateSnapshot" JSONB,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'LKR',
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Task"
  ADD COLUMN "type" "WorkItemType" NOT NULL DEFAULT 'TASK',
  ADD COLUMN "sequenceNumber" INTEGER,
  ADD COLUMN "workflowStatusKey" TEXT,
  ADD COLUMN "reporterId" TEXT,
  ADD COLUMN "parentId" TEXT,
  ADD COLUMN "sprintId" TEXT,
  ADD COLUMN "milestoneId" TEXT,
  ADD COLUMN "severity" "WorkItemSeverity",
  ADD COLUMN "storyPoints" DOUBLE PRECISION,
  ADD COLUMN "rank" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "environment" TEXT,
  ADD COLUMN "expectedResult" TEXT,
  ADD COLUMN "actualResult" TEXT,
  ADD COLUMN "reproductionSteps" TEXT,
  ADD COLUMN "releaseVersion" TEXT,
  ADD COLUMN "customFields" JSONB,
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Timesheet"
  ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "hourlyRate" DECIMAL(18,2),
  ADD COLUMN "costAmount" DECIMAL(18,2),
  ADD COLUMN "billableAmount" DECIMAL(18,2);

UPDATE "Task"
SET "sequenceNumber" = numbered."position",
    "workflowStatusKey" = "Task"."status"::TEXT
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "createdAt", "id")::INTEGER AS "position"
  FROM "Task"
) AS numbered
WHERE "Task"."id" = numbered."id";

CREATE TABLE "ProjectTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "icon" TEXT,
  "config" JSONB NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectMember" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT,
  "employeeId" TEXT,
  "role" "ProjectMemberRole" NOT NULL DEFAULT 'CONTRIBUTOR',
  "allocationPct" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectWorkflowStatus" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "WorkflowStatusCategory" NOT NULL,
  "color" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ProjectWorkflowStatus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectMilestone" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectSprint" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "goal" TEXT,
  "status" "SprintStatus" NOT NULL DEFAULT 'PLANNED',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectSprint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskAssignee" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "userId" TEXT,
  "employeeId" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskAssignee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskComment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "mentions" JSONB,
  "editedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskChecklistItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  "completedById" TEXT,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "TaskChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskAttachment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "uploadedById" TEXT,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectAttachment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "uploadedById" TEXT,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskDependency" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "dependsOnId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'BLOCKED_BY',
  CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskActivity" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Project_tenantId_code_key" ON "Project"("tenantId", "code");
CREATE INDEX "Project_tenantId_archivedAt_idx" ON "Project"("tenantId", "archivedAt");
CREATE INDEX "Task_tenantId_type_idx" ON "Task"("tenantId", "type");
CREATE INDEX "Task_tenantId_archivedAt_idx" ON "Task"("tenantId", "archivedAt");
CREATE INDEX "Task_projectId_sprintId_idx" ON "Task"("projectId", "sprintId");
CREATE INDEX "Task_projectId_rank_idx" ON "Task"("projectId", "rank");
CREATE UNIQUE INDEX "ProjectTemplate_tenantId_key_key" ON "ProjectTemplate"("tenantId", "key");
CREATE INDEX "ProjectTemplate_tenantId_isActive_idx" ON "ProjectTemplate"("tenantId", "isActive");
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");
CREATE UNIQUE INDEX "ProjectMember_projectId_employeeId_key" ON "ProjectMember"("projectId", "employeeId");
CREATE INDEX "ProjectMember_tenantId_projectId_idx" ON "ProjectMember"("tenantId", "projectId");
CREATE INDEX "ProjectMember_tenantId_userId_idx" ON "ProjectMember"("tenantId", "userId");
CREATE INDEX "ProjectMember_tenantId_employeeId_idx" ON "ProjectMember"("tenantId", "employeeId");
CREATE UNIQUE INDEX "ProjectWorkflowStatus_projectId_key_key" ON "ProjectWorkflowStatus"("projectId", "key");
CREATE INDEX "ProjectWorkflowStatus_tenantId_projectId_idx" ON "ProjectWorkflowStatus"("tenantId", "projectId");
CREATE INDEX "ProjectMilestone_tenantId_projectId_idx" ON "ProjectMilestone"("tenantId", "projectId");
CREATE INDEX "ProjectMilestone_projectId_dueDate_idx" ON "ProjectMilestone"("projectId", "dueDate");
CREATE INDEX "ProjectSprint_tenantId_projectId_idx" ON "ProjectSprint"("tenantId", "projectId");
CREATE INDEX "ProjectSprint_projectId_status_idx" ON "ProjectSprint"("projectId", "status");
CREATE UNIQUE INDEX "TaskAssignee_taskId_userId_key" ON "TaskAssignee"("taskId", "userId");
CREATE UNIQUE INDEX "TaskAssignee_taskId_employeeId_key" ON "TaskAssignee"("taskId", "employeeId");
CREATE INDEX "TaskAssignee_tenantId_taskId_idx" ON "TaskAssignee"("tenantId", "taskId");
CREATE INDEX "TaskComment_tenantId_taskId_idx" ON "TaskComment"("tenantId", "taskId");
CREATE INDEX "TaskChecklistItem_tenantId_taskId_idx" ON "TaskChecklistItem"("tenantId", "taskId");
CREATE INDEX "TaskAttachment_tenantId_taskId_idx" ON "TaskAttachment"("tenantId", "taskId");
CREATE INDEX "ProjectAttachment_tenantId_projectId_idx" ON "ProjectAttachment"("tenantId", "projectId");
CREATE UNIQUE INDEX "TaskDependency_taskId_dependsOnId_key" ON "TaskDependency"("taskId", "dependsOnId");
CREATE INDEX "TaskDependency_tenantId_taskId_idx" ON "TaskDependency"("tenantId", "taskId");
CREATE INDEX "TaskDependency_tenantId_dependsOnId_idx" ON "TaskDependency"("tenantId", "dependsOnId");
CREATE INDEX "TaskActivity_tenantId_taskId_createdAt_idx" ON "TaskActivity"("tenantId", "taskId", "createdAt");

ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "ProjectSprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectWorkflowStatus" ADD CONSTRAINT "ProjectWorkflowStatus_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectSprint" ADD CONSTRAINT "ProjectSprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectAttachment" ADD CONSTRAINT "ProjectAttachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
