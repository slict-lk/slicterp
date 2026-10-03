import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

function printSeparator(char = '=', length = 78) {
  console.log(char.repeat(length));
}

function getProgressBar(score: number, length = 20): string {
  const normalized = Math.max(0, Math.min(100, score));
  const filledLength = Math.round((normalized / 100) * length);
  const emptyLength = length - filledLength;
  const bar = '#'.repeat(filledLength) + '-'.repeat(emptyLength);
  return `[${bar}] ${normalized.toFixed(1)}%`;
}

async function main() {
  const { default: prisma } = await import('../src/lib/prisma');
  const { runDataCompatibilityAudit } = await import('./data-compatibility-auditor');

  console.log('');
  printSeparator();
  console.log('SLICT ERP - ORGANIZATIONAL INTELLIGENCE PRE-FLIGHT AUDITOR');
  printSeparator();

  const requestedSubdomain = process.argv[2];
  let tenant = await prisma.tenant.findFirst({
    where: requestedSubdomain
      ? { subdomain: requestedSubdomain }
      : {
          OR: [
            { subdomain: 'slict' },
            { subdomain: 'demo' },
            { subdomain: 'default' },
          ],
        },
  });

  if (!tenant && !requestedSubdomain) {
    tenant = await prisma.tenant.findFirst();
  }

  if (!tenant) {
    const suffix = requestedSubdomain ? ` for subdomain "${requestedSubdomain}"` : '';
    console.error(`Error: no tenant found${suffix}. Seed the database before running the audit.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('Connected to database');
  console.log(`Auditing tenant: ${tenant.name ?? tenant.companyName} (${tenant.subdomain})`);
  console.log(`Tenant ID: ${tenant.id}`);
  printSeparator('-');

  const auditResults = await runDataCompatibilityAudit(prisma, tenant.id);
  const score = auditResults.dataReadinessIndex;

  console.log('');
  console.log('GLOBAL DIAGNOSTIC SCORE');
  printSeparator('-');
  console.log(`Ready for TOC activation: ${auditResults.activationGate}`);
  console.log(`Data Readiness Index:     ${getProgressBar(score)}`);
  if (auditResults.activationGate === 'BLOCKED') {
    console.log('Hard gate:                80.0% minimum required');
  }
  printSeparator('-');

  console.log('');
  console.log('DOMAIN BREAKDOWN');
  console.log(`HR directory structure:   ${getProgressBar(auditResults.domains.hrStructure, 15)}`);
  console.log(`Attendance telemetry:     ${getProgressBar(auditResults.domains.attendance, 15)}`);
  console.log(`Task and project logs:    ${getProgressBar(auditResults.domains.tasks, 15)}`);
  console.log(`Operational audit trails: ${getProgressBar(auditResults.domains.operations, 15)}`);
  printSeparator('-');

  console.log('');
  console.log('TELEMETRY STATISTICS');
  console.log(`Active employees:              ${auditResults.details.totalEmployees}`);
  console.log(`  With manager hierarchy:      ${auditResults.details.employeesWithManager}/${Math.max(auditResults.details.totalEmployees - 1, 0)}`);
  console.log(`  Linked to ERP users:         ${auditResults.details.employeesLinkedToUsers}/${auditResults.details.totalEmployees}`);
  console.log(`  Assigned to departments:     ${auditResults.details.employeesWithDepartment}/${auditResults.details.totalEmployees}`);
  console.log(`Departments:                   ${auditResults.details.totalDepartments}`);
  console.log(`  With managerId:              ${auditResults.details.departmentsWithManager}/${auditResults.details.totalDepartments}`);
  console.log(`Attendance entries:            ${auditResults.details.totalAttendance}`);
  console.log(`  Orphaned clock-ins:          ${auditResults.details.orphanedAttendance}`);
  console.log(`  16+ hour/negative anomalies: ${auditResults.details.cleansedAttendanceAnomalies}`);
  console.log(`Project tasks:                 ${auditResults.details.totalTasks}`);
  console.log(`  With deadlines:              ${auditResults.details.tasksWithDueDate}/${auditResults.details.totalTasks}`);
  console.log(`  Assigned to users:           ${auditResults.details.tasksAssigned}/${auditResults.details.totalTasks}`);
  console.log(`Legacy sales orders:           ${auditResults.details.legacyOrdersCount}`);
  console.log(`SalesOrderV2 records:          ${auditResults.details.salesOrdersV2Count}`);
  console.log(`  With createdByUserId:        ${auditResults.details.salesOrdersV2WithCreator}/${auditResults.details.salesOrdersV2Count}`);
  console.log(`Approval records:              ${auditResults.details.approvalRecordsCount}`);
  console.log(`  Completed decision trails:   ${auditResults.details.completedApprovalRecords}/${auditResults.details.approvalRecordsCount}`);
  printSeparator('-');

  if (auditResults.warnings.length > 0) {
    console.log('');
    console.log('WARNING FLAGS');
    auditResults.warnings.forEach((warning) => console.log(`- ${warning}`));
    printSeparator('-');
  }

  if (auditResults.actionItems.length > 0) {
    console.log('');
    console.log('REQUIRED DATA CLEANUP CHECKLIST');
    auditResults.actionItems.forEach((action, index) => console.log(`${index + 1}. [ ] ${action}`));
    printSeparator('-');
  } else {
    console.log('');
    console.log('No data cleanup actions were detected.');
    printSeparator('-');
  }

  console.log('');
}

main().catch(async (error) => {
  console.error('');
  console.error('Pre-flight audit failed.');
  console.error(`Message: ${error.message || error}`);
  if (error.code) console.error(`Error code: ${error.code}`);
  if (error.meta) console.error(`Meta: ${JSON.stringify(error.meta, null, 2)}`);
  console.error(error.stack);

  const { default: prisma } = await import('../src/lib/prisma');
  await prisma.$disconnect();
  process.exit(1);
});
