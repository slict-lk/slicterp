CREATE TABLE "OperationalEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorUserId" TEXT,
  "employeeId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "durationMs" INTEGER,
  "metadata" JSONB,

  CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployeeCapacitySnapshot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "functionalCapacity" DOUBLE PRECISION NOT NULL,
  "leadershipCapacity" DOUBLE PRECISION NOT NULL,
  "cognitiveComplexity" DOUBLE PRECISION NOT NULL,
  "systemDependency" DOUBLE PRECISION NOT NULL,
  "productivity" DOUBLE PRECISION NOT NULL,
  "stressLoad" DOUBLE PRECISION NOT NULL,
  "growthPotential" DOUBLE PRECISION NOT NULL,
  "successionReadiness" DOUBLE PRECISION NOT NULL,
  "adaptability" DOUBLE PRECISION NOT NULL,
  "category" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "formulaVersion" TEXT NOT NULL,
  "inputSummary" JSONB NOT NULL,
  "warnings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmployeeCapacitySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TocConstraint" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "severity" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL,
  "linkedEmployeeId" TEXT,
  "linkedDepartmentId" TEXT,
  "linkedProcessKey" TEXT,
  "evidence" JSONB,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "TocConstraint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperationalEvent_tenantId_moduleKey_idx" ON "OperationalEvent"("tenantId", "moduleKey");
CREATE INDEX "OperationalEvent_tenantId_entityType_entityId_idx" ON "OperationalEvent"("tenantId", "entityType", "entityId");
CREATE INDEX "OperationalEvent_tenantId_actorUserId_idx" ON "OperationalEvent"("tenantId", "actorUserId");
CREATE INDEX "OperationalEvent_tenantId_employeeId_idx" ON "OperationalEvent"("tenantId", "employeeId");
CREATE INDEX "OperationalEvent_tenantId_occurredAt_idx" ON "OperationalEvent"("tenantId", "occurredAt");

CREATE INDEX "EmployeeCapacitySnapshot_tenantId_idx" ON "EmployeeCapacitySnapshot"("tenantId");
CREATE INDEX "EmployeeCapacitySnapshot_employeeId_idx" ON "EmployeeCapacitySnapshot"("employeeId");
CREATE INDEX "EmployeeCapacitySnapshot_tenantId_createdAt_idx" ON "EmployeeCapacitySnapshot"("tenantId", "createdAt");
CREATE INDEX "EmployeeCapacitySnapshot_tenantId_category_idx" ON "EmployeeCapacitySnapshot"("tenantId", "category");

CREATE INDEX "TocConstraint_tenantId_idx" ON "TocConstraint"("tenantId");
CREATE INDEX "TocConstraint_tenantId_type_idx" ON "TocConstraint"("tenantId", "type");
CREATE INDEX "TocConstraint_tenantId_status_idx" ON "TocConstraint"("tenantId", "status");
CREATE INDEX "TocConstraint_tenantId_detectedAt_idx" ON "TocConstraint"("tenantId", "detectedAt");
