ALTER TABLE "Employee" ADD COLUMN "managerId" TEXT;

ALTER TABLE "Employee"
ADD CONSTRAINT "Employee_managerId_fkey"
FOREIGN KEY ("managerId") REFERENCES "Employee"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Employee_managerId_idx" ON "Employee"("managerId");
