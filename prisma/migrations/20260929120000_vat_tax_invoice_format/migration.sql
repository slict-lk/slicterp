-- VAT tax invoice format: Gazette 2481/22, as amended by Gazette 2500/106.
-- Mandatory for VAT-registered persons from 1 October 2026.
--
-- APPLY THIS BEFORE DEPLOYING THE CODE THAT SHIPS WITH IT. The new Prisma client
-- selects Invoice."dateOfSupply", so deploying first breaks every invoice query
-- for every tenant. Each step below is backward compatible with the code that is
-- deployed today, so migrating first is safe, and the code can be rolled back
-- without reversing this migration.

-- Invoice numbers become unique per tenant instead of across all tenants. Each
-- tenant is a separate VAT-registered person with its own sequence, so two
-- tenants will legitimately both issue 26OCT_HQ_00001. Existing numbers are
-- already unique across all tenants, so creating this index cannot fail. It is
-- created before the old index is dropped so uniqueness never lapses.
CREATE UNIQUE INDEX "Invoice_tenantId_number_key" ON "Invoice"("tenantId", "number");
DROP INDEX "Invoice_number_key";

-- Date of supply is a mandatory particular, distinct from the invoice date.
-- Nullable: only invoices issued in the tax invoice format must carry it.
ALTER TABLE "Invoice" ADD COLUMN "dateOfSupply" TIMESTAMP(3);

-- Gap-free sequence per tenant and classification code (the QQQQ part).
CREATE TABLE "InvoiceCounter" (
    "tenantId" TEXT NOT NULL,
    "classificationCode" TEXT NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("tenantId","classificationCode")
);
