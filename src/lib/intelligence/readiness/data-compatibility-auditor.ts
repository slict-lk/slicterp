import { PrismaClient } from '@prisma/client';

export interface AuditResults {
  tenantId: string;
  tenantName: string;
  dataReadinessIndex: number;
  activationGate: 'PASS' | 'BLOCKED';
  domains: {
    hrStructure: number;
    attendance: number;
    tasks: number;
    operations: number;
  };
  details: {
    totalEmployees: number;
    employeesWithManager: number;
    employeesLinkedToUsers: number;
    employeesWithDepartment: number;
    totalDepartments: number;
    departmentsWithManager: number;
    totalAttendance: number;
    orphanedAttendance: number;
    cleansedAttendanceAnomalies: number;
    totalTasks: number;
    tasksWithDueDate: number;
    tasksAssigned: number;
    legacyOrdersCount: number;
    salesOrdersV2Count: number;
    salesOrdersV2WithCreator: number;
    approvalRecordsCount: number;
    completedApprovalRecords: number;
  };
  warnings: string[];
  actionItems: string[];
}

const DRI_ACTIVATION_THRESHOLD = 80;

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function calculateReadinessIndex(scores: AuditResults['domains']) {
  const weightedScore =
    (scores.hrStructure * 0.3) +
    (scores.attendance * 0.3) +
    (scores.tasks * 0.2) +
    (scores.operations * 0.2);

  const weakDomainPenalty = Object.values(scores)
    .reduce((total, score) => total + Math.max(0, DRI_ACTIVATION_THRESHOLD - score) * 0.7, 0);

  return roundScore(Math.max(0, weightedScore - weakDomainPenalty));
}

/**
 * Pre-flight Data Compatibility and Integrity Auditor.
 *
 * This checks the current tenant's schema-backed data before any TOC/AI
 * decision layer is trusted. The goal is to block weak recommendations when
 * transactional data cannot support them.
 */
export async function runDataCompatibilityAudit(
  prisma: PrismaClient,
  tenantId: string
): Promise<AuditResults> {
  const warnings: string[] = [];
  const actionItems: string[] = [];

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, companyName: true },
  });

  const tenantName = tenant?.name || tenant?.companyName || 'Unknown Tenant';

  const totalEmployees = await prisma.employee.count({
    where: { tenantId, isActive: true },
  });

  if (totalEmployees === 0) {
    return {
      tenantId,
      tenantName,
      dataReadinessIndex: 0,
      activationGate: 'BLOCKED',
      domains: { hrStructure: 0, attendance: 0, tasks: 0, operations: 0 },
      details: {
        totalEmployees: 0,
        employeesWithManager: 0,
        employeesLinkedToUsers: 0,
        employeesWithDepartment: 0,
        totalDepartments: 0,
        departmentsWithManager: 0,
        totalAttendance: 0,
        orphanedAttendance: 0,
        cleansedAttendanceAnomalies: 0,
        totalTasks: 0,
        tasksWithDueDate: 0,
        tasksAssigned: 0,
        legacyOrdersCount: 0,
        salesOrdersV2Count: 0,
        salesOrdersV2WithCreator: 0,
        approvalRecordsCount: 0,
        completedApprovalRecords: 0,
      },
      warnings: ['Critical: no active employees are registered for this tenant.'],
      actionItems: ['Add active employees through the HR Employees screen before enabling workforce analytics.'],
    };
  }

  const employeesLinkedToUsers = await prisma.employee.count({
    where: { tenantId, isActive: true, user: { isNot: null } },
  });

  const employeesWithManager = await prisma.employee.count({
    where: { tenantId, isActive: true, managerId: { not: null } },
  });

  const employeesWithDepartment = await prisma.employee.count({
    where: { tenantId, isActive: true, departmentId: { not: null } },
  });

  const totalDepartments = await prisma.department.count({ where: { tenantId } });
  const departmentsWithManager = await prisma.department.count({
    where: { tenantId, managerId: { not: null } },
  });

  const expectedManagedEmployees = Math.max(totalEmployees - 1, 1);
  const managerCoverageRatio = totalEmployees > 1
    ? Math.min(employeesWithManager / expectedManagedEmployees, 1)
    : 1;
  const departmentCoverageScore = (employeesWithDepartment / totalEmployees) * 35;
  const userLinkageScore = (employeesLinkedToUsers / totalEmployees) * 20;
  const employeeManagerScore = managerCoverageRatio * 25;
  const departmentLeadershipScore = totalDepartments > 0
    ? (departmentsWithManager / totalDepartments) * 20
    : 0;
  const hrStructureScore = departmentCoverageScore + userLinkageScore + employeeManagerScore + departmentLeadershipScore;

  if (employeesWithDepartment < totalEmployees) {
    warnings.push(`${totalEmployees - employeesWithDepartment} employee(s) are not assigned to a department.`);
    actionItems.push('Assign every active employee to a department so constraint analysis has an organization map.');
  }

  if (employeesLinkedToUsers < totalEmployees) {
    warnings.push(`${totalEmployees - employeesLinkedToUsers} employee(s) are not linked to ERP user accounts.`);
    actionItems.push('Link employees to user accounts where they perform approvals, tasks, or operational actions.');
  }

  if (employeesWithManager < expectedManagedEmployees) {
    warnings.push(`${expectedManagedEmployees - employeesWithManager} employee(s) are missing managerId hierarchy links.`);
    actionItems.push('Populate employee managerId links so dependency and succession analytics can traverse reporting lines.');
  }

  if (totalDepartments === 0) {
    warnings.push('No departments exist for this tenant.');
    actionItems.push('Create departments before enabling dependency, succession, and leadership-load analytics.');
  } else if (departmentsWithManager < totalDepartments) {
    warnings.push(`${totalDepartments - departmentsWithManager} department(s) have no managerId configured.`);
    actionItems.push('Assign department managers so the system can identify overloaded leadership nodes.');
  }

  const totalAttendance = await prisma.attendance.count({ where: { tenantId } });
  const orphanedAttendance = await prisma.attendance.count({
    where: { tenantId, checkIn: { not: null }, checkOut: null },
  });

  const completedAttendances = await prisma.attendance.findMany({
    where: { tenantId, checkIn: { not: null }, checkOut: { not: null } },
    select: { checkIn: true, checkOut: true },
  });

  let cleansedAttendanceAnomalies = 0;
  completedAttendances.forEach((attendance) => {
    if (!attendance.checkIn || !attendance.checkOut) return;

    const hours = (attendance.checkOut.getTime() - attendance.checkIn.getTime()) / (1000 * 60 * 60);
    if (hours > 16 || hours < 0) {
      cleansedAttendanceAnomalies += 1;
    }
  });

  const anomalyRate = totalAttendance > 0
    ? (orphanedAttendance + cleansedAttendanceAnomalies) / totalAttendance
    : 0;
  const attendanceScore = Math.max(0, (1 - anomalyRate) * 100);

  if (totalAttendance === 0) {
    warnings.push('No attendance records are available for this tenant.');
    actionItems.push('Capture attendance data before relying on stress-load or burnout analytics.');
  }

  if (orphanedAttendance > 0) {
    warnings.push(`${orphanedAttendance} attendance record(s) have check-in values without check-out values.`);
    actionItems.push('Close or correct orphaned attendance records before calculating stress load.');
  }

  if (cleansedAttendanceAnomalies > 0) {
    warnings.push(`${cleansedAttendanceAnomalies} attendance record(s) exceed the 16-hour cap or have negative durations.`);
    actionItems.push('Review extreme attendance durations and correct forgotten clock-outs.');
  }

  const totalTasks = await prisma.task.count({ where: { tenantId } });
  const tasksWithDueDate = await prisma.task.count({
    where: { tenantId, dueDate: { not: null } },
  });
  const tasksAssigned = await prisma.task.count({
    where: { tenantId, assigneeId: { not: null } },
  });

  let taskScore = 80;
  if (totalTasks > 0) {
    taskScore = ((tasksWithDueDate / totalTasks) * 50) + ((tasksAssigned / totalTasks) * 50);
  } else {
    warnings.push('No project tasks are currently logged in the workspace.');
    actionItems.push('Create project tasks to support productivity, overload, and system-dependency analytics.');
  }

  if (totalTasks > 0 && tasksWithDueDate < totalTasks) {
    warnings.push(`${totalTasks - tasksWithDueDate} task(s) do not have dueDate values.`);
    actionItems.push('Set target deadlines on active tasks to enable SLA and stress analysis.');
  }

  if (totalTasks > 0 && tasksAssigned < totalTasks) {
    warnings.push(`${totalTasks - tasksAssigned} task(s) are unassigned.`);
    actionItems.push('Assign tasks directly to responsible users or employees.');
  }

  const legacyOrdersCount = await prisma.salesOrder.count({ where: { tenantId } });
  const salesOrdersV2Count = await prisma.salesOrderV2.count({ where: { tenantId } });
  const salesOrdersV2WithCreator = await prisma.salesOrderV2.count({
    where: { tenantId, createdByUserId: { not: null } },
  });
  const approvalRecordsCount = await prisma.salesOrderApproval.count({ where: { tenantId } });
  const completedApprovalRecords = await prisma.salesOrderApproval.count({
    where: {
      tenantId,
      status: { in: ['APPROVED', 'REJECTED'] },
      approverUserId: { not: null },
      decidedAt: { not: null },
    },
  });

  let operationsScore = 80;
  if (salesOrdersV2Count > 0 || approvalRecordsCount > 0) {
    const creatorScore = salesOrdersV2Count > 0
      ? (salesOrdersV2WithCreator / salesOrdersV2Count) * 50
      : 25;
    const approvalScore = approvalRecordsCount > 0
      ? (completedApprovalRecords / approvalRecordsCount) * 50
      : 35;

    operationsScore = creatorScore + approvalScore;
  } else if (legacyOrdersCount > 0) {
    operationsScore = 45;
    warnings.push('Only legacy SalesOrder records were found; they have limited user/action traceability.');
    actionItems.push('Move new sales workflows onto SalesOrderV2 approvals before trusting bottleneck analytics.');
  } else {
    warnings.push('No sales orders or approval records are available for operational bottleneck analysis.');
    actionItems.push('Capture approval-enabled operational transactions before enabling process constraint analytics.');
  }

  if (salesOrdersV2Count > 0 && salesOrdersV2WithCreator < salesOrdersV2Count) {
    warnings.push(`${salesOrdersV2Count - salesOrdersV2WithCreator} SalesOrderV2 record(s) lack createdByUserId.`);
    actionItems.push('Backfill and enforce createdByUserId on SalesOrderV2 records.');
  }

  if (approvalRecordsCount > 0 && completedApprovalRecords < approvalRecordsCount) {
    warnings.push(`${approvalRecordsCount - completedApprovalRecords} approval record(s) lack a completed decision trail.`);
    actionItems.push('Ensure approvals store final status, approverUserId, and decidedAt timestamps.');
  }

  const domains = {
    hrStructure: Math.round(hrStructureScore),
    attendance: Math.round(attendanceScore),
    tasks: Math.round(taskScore),
    operations: Math.round(operationsScore),
  };
  const dataReadinessIndex = calculateReadinessIndex(domains);

  return {
    tenantId,
    tenantName,
    dataReadinessIndex,
    activationGate: dataReadinessIndex >= DRI_ACTIVATION_THRESHOLD ? 'PASS' : 'BLOCKED',
    domains,
    details: {
      totalEmployees,
      employeesWithManager,
      employeesLinkedToUsers,
      employeesWithDepartment,
      totalDepartments,
      departmentsWithManager,
      totalAttendance,
      orphanedAttendance,
      cleansedAttendanceAnomalies,
      totalTasks,
      tasksWithDueDate,
      tasksAssigned,
      legacyOrdersCount,
      salesOrdersV2Count,
      salesOrdersV2WithCreator,
      approvalRecordsCount,
      completedApprovalRecords,
    },
    warnings,
    actionItems: Array.from(new Set(actionItems)),
  };
}
