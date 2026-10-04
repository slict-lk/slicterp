-- AlterTable
ALTER TABLE "User" ADD COLUMN     "modulePermissions" JSONB,
ADD COLUMN     "role" TEXT DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
