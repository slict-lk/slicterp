import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const [projects, tasks, timesheets] = await Promise.all([
    prisma.project.count(),
    prisma.task.count(),
    prisma.timesheet.count(),
  ]);
  const invalidTasks = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Task" task
    LEFT JOIN "Project" project ON project."id" = task."projectId"
    WHERE project."id" IS NULL OR project."tenantId" <> task."tenantId"
  `;
  const duplicateCodes = await prisma.$queryRaw<Array<{ tenantId: string; code: string; count: bigint }>>`
    SELECT "tenantId", "code", COUNT(*)::bigint AS count
    FROM "Project"
    GROUP BY "tenantId", "code"
    HAVING COUNT(*) > 1
  `;
  console.log(JSON.stringify({
    records: { projects, tasks, timesheets },
    invalidTaskTenantLinks: Number(invalidTasks[0]?.count || 0),
    duplicateTenantProjectCodes: duplicateCodes.length,
    safeToMigrate: Number(invalidTasks[0]?.count || 0) === 0 && duplicateCodes.length === 0,
  }, null, 2));
}
main().finally(() => prisma.$disconnect());
