CREATE TABLE "DataReadinessAudit" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL,
  "domains" JSONB NOT NULL,
  "details" JSONB NOT NULL,
  "warnings" JSONB NOT NULL,
  "actionItems" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DataReadinessAudit_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DataReadinessAudit"
ADD CONSTRAINT "DataReadinessAudit_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE INDEX "DataReadinessAudit_tenantId_idx" ON "DataReadinessAudit"("tenantId");
CREATE INDEX "DataReadinessAudit_tenantId_createdAt_idx" ON "DataReadinessAudit"("tenantId", "createdAt");
CREATE INDEX "DataReadinessAudit_status_idx" ON "DataReadinessAudit"("status");
