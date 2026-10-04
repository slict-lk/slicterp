ALTER TABLE "ProjectAttachment" ADD COLUMN "storageKey" TEXT;
CREATE INDEX "ProjectAttachment_tenantId_storageKey_idx" ON "ProjectAttachment"("tenantId", "storageKey");
