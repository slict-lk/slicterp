import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { getLatestDataReadinessAudit } from '../readiness/readiness-service';

const SNAPSHOT_FORMULA_VERSION = 'v1.1.0';

type WorkforceSnapshotRow = {
  id: string;
  tenantId: string;
  employeeId: string;
  functionalCapacity: number;
  leadershipCapacity: number;
  cognitiveComplexity: number;
  systemDependency: number;
  productivity: number;
  stressLoad: number;
  growthPotential: number;
  successionReadiness: number;
  adaptability: number;
  category: string;
  confidence: number;
  formulaVersion: string;
  inputSummary: Record<string, unknown>;
  warnings: string[] | null;
  createdAt: Date;
  firstName: string;
  lastName: string;
  position: string;
  managerId: string | null;
  departmentId: string | null;
  departmentName: string | null;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function toHours(start?: Date | null, end?: Date | null) {
  if (!start || !end) return null;
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export async function generateEmployeeCapacitySnapshots(
  prisma: PrismaClient,
  tenantId: string
) {
  const latestReadiness = await getLatestDataReadinessAudit(prisma, tenantId);
  if (!latestReadiness || latestReadiness.status !== 'PASS') {
    throw new Error('Data readiness gate is blocked. Run and pass the readiness audit before generating workforce snapshots.');
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [employees, users, tasks, approvals, orders, attendances, timesheets, leaveRequests, operationalEvents] = await Promise.all([
    prisma.employee.findMany({
      where: { tenantId, isActive: true },
      include: {
        department: true,
      },
      orderBy: { firstName: 'asc' },
    }),
    prisma.user.findMany({
      where: { tenantId, employeeId: { not: null }, isActive: true },
      select: { id: true, employeeId: true },
    }),
    prisma.task.findMany({
      where: {
        tenantId,
        OR: [
          { createdAt: { gte: ninetyDaysAgo } },
          { updatedAt: { gte: ninetyDaysAgo } },
          { completedAt: { gte: ninetyDaysAgo } },
        ],
      },
      select: {
        id: true,
        assigneeId: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
      },
    }),
    prisma.salesOrderApproval.findMany({
      where: {
        tenantId,
        createdAt: { gte: ninetyDaysAgo },
      },
      select: {
        id: true,
        requestedByUserId: true,
        approverUserId: true,
        status: true,
        decidedAt: true,
      },
    }),
    prisma.salesOrderV2.findMany({
      where: {
        tenantId,
        createdAt: { gte: ninetyDaysAgo },
      },
      select: {
        id: true,
        createdByUserId: true,
        approvalStatus: true,
      },
    }),
    prisma.attendance.findMany({
      where: {
        tenantId,
        date: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        employeeId: true,
        checkIn: true,
        checkOut: true,
        status: true,
      },
    }),
    prisma.timesheet.findMany({
      where: {
        tenantId,
        date: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        employeeId: true,
        projectId: true,
        taskId: true,
        date: true,
        hours: true,
        billable: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        tenantId,
        OR: [
          { createdAt: { gte: ninetyDaysAgo } },
          { startDate: { gte: ninetyDaysAgo } },
          { endDate: { gte: ninetyDaysAgo } },
        ],
      },
      select: {
        id: true,
        employeeId: true,
        status: true,
        days: true,
        startDate: true,
        endDate: true,
      },
    }),
    prisma.$queryRaw<Array<{
      id: string;
      moduleKey: string;
      entityType: string;
      action: string;
      actorUserId: string | null;
      employeeId: string | null;
      occurredAt: Date;
      durationMs: number | null;
      metadata: Record<string, unknown> | null;
    }>>`
      SELECT
        "id",
        "moduleKey",
        "entityType",
        "action",
        "actorUserId",
        "employeeId",
        "occurredAt",
        "durationMs",
        "metadata"
      FROM "OperationalEvent"
      WHERE "tenantId" = ${tenantId}
        AND "occurredAt" >= ${ninetyDaysAgo}
      ORDER BY "occurredAt" DESC
      LIMIT 1000
    `,
  ]);

  const userByEmployeeId = new Map(users.map((user) => [user.employeeId as string, user.id]));
  const directReportCount = new Map<string, number>();
  employees.forEach((employee) => {
    if (employee.managerId) {
      directReportCount.set(employee.managerId, (directReportCount.get(employee.managerId) ?? 0) + 1);
    }
  });

  const totalAssignedTasks = Math.max(tasks.filter((task) => task.assigneeId).length, 1);
  const totalOrdersCreated = Math.max(orders.filter((order) => order.createdByUserId).length, 1);
  const totalPendingApprovals = Math.max(approvals.filter((approval) => approval.status === 'PENDING').length, 1);
  const totalOperationalEvents = Math.max(operationalEvents.length, 1);
  const totalApprovalsHandled = Math.max(approvals.filter((approval) => approval.approverUserId).length, 1);

  const insertedRows: WorkforceSnapshotRow[] = [];

  for (const employee of employees) {
    const userId = userByEmployeeId.get(employee.id) ?? null;
    const assignedTasks = userId ? tasks.filter((task) => task.assigneeId === userId) : [];
    const completedTasks = assignedTasks.filter((task) => task.status === 'DONE' || task.completedAt);
    const overdueTasks = assignedTasks.filter((task) => !task.completedAt && task.dueDate && task.dueDate < now);
    const urgentTasks = assignedTasks.filter((task) => task.priority === 'HIGH' || task.priority === 'URGENT');

    const approvalsRequested = userId ? approvals.filter((approval) => approval.requestedByUserId === userId) : [];
    const approvalsHandled = userId ? approvals.filter((approval) => approval.approverUserId === userId) : [];
    const pendingApprovals = approvalsHandled.filter((approval) => approval.status === 'PENDING');
    const ordersCreated = userId ? orders.filter((order) => order.createdByUserId === userId) : [];
    const employeeTimesheets = timesheets.filter((timesheet) => timesheet.employeeId === employee.id);
    const employeeLeaveRequests = leaveRequests.filter((leave) => leave.employeeId === employee.id);
    const employeeEvents = operationalEvents.filter((event) => {
      return event.employeeId === employee.id || Boolean(userId && event.actorUserId === userId);
    });

    const attendanceRows = attendances.filter((attendance) => attendance.employeeId === employee.id);
    const validAttendanceRows = attendanceRows.filter((attendance) => {
      const hours = toHours(attendance.checkIn, attendance.checkOut);
      return hours !== null && hours >= 0 && hours <= 16;
    });
    const anomalyCount = attendanceRows.length - validAttendanceRows.length;
    const overtimeSessions = validAttendanceRows.filter((attendance) => {
      const hours = toHours(attendance.checkIn, attendance.checkOut);
      return hours !== null && hours > 9;
    }).length;
    const averageHours = validAttendanceRows.length > 0
      ? validAttendanceRows.reduce((total, attendance) => total + (toHours(attendance.checkIn, attendance.checkOut) ?? 0), 0) / validAttendanceRows.length
      : 0;
    const timesheetHours = employeeTimesheets.reduce((total, timesheet) => total + Number(timesheet.hours || 0), 0);
    const billableTimesheetHours = employeeTimesheets
      .filter((timesheet) => timesheet.billable)
      .reduce((total, timesheet) => total + Number(timesheet.hours || 0), 0);
    const pendingLeaveDays = employeeLeaveRequests
      .filter((leave) => leave.status === 'PENDING')
      .reduce((total, leave) => total + Number(leave.days || 0), 0);
    const approvedLeaveDays = employeeLeaveRequests
      .filter((leave) => leave.status === 'APPROVED')
      .reduce((total, leave) => total + Number(leave.days || 0), 0);
    const longRunningEvents = employeeEvents.filter((event) => Number(event.durationMs || 0) > 8 * 60 * 60 * 1000);
    const activityScore = clamp((employeeEvents.length / totalOperationalEvents) * 100);

    const peerEmployees = employees.filter(
      (peer) => peer.id !== employee.id && peer.departmentId && peer.departmentId === employee.departmentId
    );
    const peersWithUsers = peerEmployees.filter((peer) => userByEmployeeId.has(peer.id));

    const isDepartmentManager = employee.department?.managerId === employee.id;
    const directReports = directReportCount.get(employee.id) ?? 0;

    const taskCompletionScore = assignedTasks.length > 0
      ? (completedTasks.length / assignedTasks.length) * 100
      : null;
    const timesheetUtilizationScore = timesheetHours > 0
      ? clamp((billableTimesheetHours / Math.max(timesheetHours, 1)) * 100)
      : null;
    const productivity = clamp(
      (taskCompletionScore ?? 52) * 0.55 +
      (timesheetUtilizationScore ?? (attendanceRows.length > 0 ? 62 : 45)) * 0.25 +
      (Math.max(0, 100 - overdueTasks.length * 12)) * 0.2
    );

    const systemDependency = clamp(
      ((assignedTasks.length / totalAssignedTasks) * 45) +
      ((ordersCreated.length / totalOrdersCreated) * 25) +
      ((pendingApprovals.length / totalPendingApprovals) * 20) +
      (activityScore * 0.1)
    );

    const stressLoad = clamp(
      (overdueTasks.length * 15) +
      (overtimeSessions * 12) +
      (pendingApprovals.length * 12) +
      Math.max(0, averageHours - 8) * 8 +
      Math.max(0, timesheetHours - 160) * 0.45 +
      (longRunningEvents.length * 8) +
      (pendingLeaveDays * 1.5)
    );

    const leadershipCapacity = clamp(30 + (directReports * 15) + (isDepartmentManager ? 20 : 0) + (approvalsHandled.length * 5));
    const cognitiveComplexity = clamp(40 + (urgentTasks.length * 8) + (approvalsHandled.length * 10) + (isDepartmentManager ? 10 : 0) + (activityScore * 0.08));
    const functionalCapacity = clamp(35 + (completedTasks.length * 7) + Math.min(validAttendanceRows.length, 15) + (ordersCreated.length * 4) + Math.min(timesheetHours / 8, 18));
    const adaptability = clamp(82 - (anomalyCount * 16) - (overdueTasks.length * 4) - (approvedLeaveDays * 0.8) + (completedTasks.length * 2) + Math.min(employeeEvents.length, 10));
    const successionReadiness = clamp((peerEmployees.length * 22) + (peersWithUsers.length * 10) - Math.max(0, systemDependency - 65) * 0.35);
    const growthPotential = clamp(
      (productivity * 0.45) +
      (adaptability * 0.25) +
      (leadershipCapacity * 0.15) +
      ((100 - stressLoad) * 0.15)
    );

    let confidence = 0;
    confidence += employee.departmentId ? 20 : 0;
    confidence += userId ? 20 : 0;
    confidence += (employee.managerId || directReports > 0 || isDepartmentManager) ? 15 : 0;
    confidence += attendanceRows.length >= 5 ? 15 : attendanceRows.length * 3;
    confidence += assignedTasks.length > 0 || ordersCreated.length > 0 || approvalsHandled.length > 0 || employeeEvents.length > 0 ? 18 : 6;
    confidence += employeeTimesheets.length > 0 ? 7 : 0;
    confidence += Math.max(0, 12 - (anomalyCount * 8));
    confidence = clamp(confidence);

    const warnings: string[] = [];
    if (!employee.departmentId) warnings.push('Employee is missing a department assignment.');
    if (!userId) warnings.push('Employee is not linked to an ERP user account.');
    if (!employee.managerId && !isDepartmentManager && directReports === 0) warnings.push('Employee is missing a manager chain link.');
    if (anomalyCount > 0) warnings.push(`${anomalyCount} attendance anomaly record(s) were excluded from scoring.`);
    if (assignedTasks.length === 0) warnings.push('No assigned tasks were available for direct productivity scoring.');
    if (employeeEvents.length === 0) warnings.push('No operational event telemetry was available for this employee.');
    if (timesheetHours > 180) warnings.push('Timesheet load is above the monthly pressure threshold.');
    if (pendingLeaveDays > 0 && stressLoad >= 60) warnings.push('Pending leave overlaps with an already pressured workload profile.');

    let category = 'STABLE_CAPACITY';
    if (stressLoad >= 75 || (systemDependency >= 70 && successionReadiness < 40)) {
      category = 'CRITICAL_RISK';
    } else if (stressLoad >= 60 || overdueTasks.length >= 3) {
      category = 'PRESSURE_ZONE';
    } else if (productivity >= 75 && leadershipCapacity >= 60 && growthPotential >= 70) {
      category = 'STRATEGIC_TALENT';
    } else if (productivity >= 65 || growthPotential >= 65) {
      category = 'HIGH_CAPACITY';
    }

    const inputSummary = {
      assignedTasks: assignedTasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      urgentTasks: urgentTasks.length,
      approvalsRequested: approvalsRequested.length,
      approvalsHandled: approvalsHandled.length,
      pendingApprovals: pendingApprovals.length,
      ordersCreated: ordersCreated.length,
      operationalEvents: employeeEvents.length,
      longRunningEvents: longRunningEvents.length,
      timesheetEntries: employeeTimesheets.length,
      timesheetHours: round(timesheetHours),
      billableTimesheetHours: round(billableTimesheetHours),
      pendingLeaveDays: round(pendingLeaveDays),
      approvedLeaveDays: round(approvedLeaveDays),
      attendanceRecords: attendanceRows.length,
      attendanceAnomalies: anomalyCount,
      overtimeSessions,
      averageHours: round(averageHours),
      peerCoverage: peerEmployees.length,
      directReports,
    };

    const snapshotId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "EmployeeCapacitySnapshot" (
        "id",
        "tenantId",
        "employeeId",
        "functionalCapacity",
        "leadershipCapacity",
        "cognitiveComplexity",
        "systemDependency",
        "productivity",
        "stressLoad",
        "growthPotential",
        "successionReadiness",
        "adaptability",
        "category",
        "confidence",
        "formulaVersion",
        "inputSummary",
        "warnings"
      )
      VALUES (
        ${snapshotId},
        ${tenantId},
        ${employee.id},
        ${round(functionalCapacity)},
        ${round(leadershipCapacity)},
        ${round(cognitiveComplexity)},
        ${round(systemDependency)},
        ${round(productivity)},
        ${round(stressLoad)},
        ${round(growthPotential)},
        ${round(successionReadiness)},
        ${round(adaptability)},
        ${category},
        ${round(confidence)},
        ${SNAPSHOT_FORMULA_VERSION},
        ${JSON.stringify(inputSummary)}::jsonb,
        ${JSON.stringify(warnings)}::jsonb
      )
    `;

    insertedRows.push({
      id: snapshotId,
      tenantId,
      employeeId: employee.id,
      functionalCapacity: round(functionalCapacity),
      leadershipCapacity: round(leadershipCapacity),
      cognitiveComplexity: round(cognitiveComplexity),
      systemDependency: round(systemDependency),
      productivity: round(productivity),
      stressLoad: round(stressLoad),
      growthPotential: round(growthPotential),
      successionReadiness: round(successionReadiness),
      adaptability: round(adaptability),
      category,
      confidence: round(confidence),
      formulaVersion: SNAPSHOT_FORMULA_VERSION,
      inputSummary,
      warnings,
      createdAt: now,
      firstName: employee.firstName,
      lastName: employee.lastName,
      position: employee.position,
      managerId: employee.managerId,
      departmentId: employee.departmentId,
      departmentName: employee.department?.name ?? null,
    });
  }

  return insertedRows;
}

export async function getLatestWorkforceSnapshots(
  prisma: PrismaClient,
  tenantId: string
) {
  return prisma.$queryRaw<WorkforceSnapshotRow[]>`
    SELECT DISTINCT ON (snap."employeeId")
      snap."id",
      snap."tenantId",
      snap."employeeId",
      snap."functionalCapacity",
      snap."leadershipCapacity",
      snap."cognitiveComplexity",
      snap."systemDependency",
      snap."productivity",
      snap."stressLoad",
      snap."growthPotential",
      snap."successionReadiness",
      snap."adaptability",
      snap."category",
      snap."confidence",
      snap."formulaVersion",
      snap."inputSummary",
      snap."warnings",
      snap."createdAt",
      emp."firstName",
      emp."lastName",
      emp."position",
      emp."managerId",
      emp."departmentId",
      dept."name" AS "departmentName"
    FROM "EmployeeCapacitySnapshot" snap
    INNER JOIN "Employee" emp ON emp."id" = snap."employeeId"
    LEFT JOIN "Department" dept ON dept."id" = emp."departmentId"
    WHERE snap."tenantId" = ${tenantId}
    ORDER BY snap."employeeId", snap."createdAt" DESC
  `;
}

export async function getWorkforceDashboardData(
  prisma: PrismaClient,
  tenantId: string
) {
  const snapshots = await getLatestWorkforceSnapshots(prisma, tenantId);
  const categories = snapshots.reduce<Record<string, number>>((acc, snapshot) => {
    acc[snapshot.category] = (acc[snapshot.category] ?? 0) + 1;
    return acc;
  }, {});

  const summary = {
    employeeCount: snapshots.length,
    averageStressLoad: round(snapshots.reduce((sum, row) => sum + row.stressLoad, 0) / Math.max(snapshots.length, 1)),
    averageConfidence: round(snapshots.reduce((sum, row) => sum + row.confidence, 0) / Math.max(snapshots.length, 1)),
    criticalRiskCount: snapshots.filter((row) => row.category === 'CRITICAL_RISK').length,
    pressureZoneCount: snapshots.filter((row) => row.category === 'PRESSURE_ZONE').length,
    categories,
    latestGeneratedAt: snapshots[0]?.createdAt ?? null,
  };

  const departments = Object.values(
    snapshots.reduce<Record<string, {
      departmentId: string | null;
      departmentName: string;
      employees: number;
      averageStress: number;
      averageDependency: number;
      highRiskCount: number;
    }>>((acc, snapshot) => {
      const key = snapshot.departmentId ?? 'unassigned';
      const name = snapshot.departmentName ?? 'Unassigned';
      if (!acc[key]) {
        acc[key] = {
          departmentId: snapshot.departmentId,
          departmentName: name,
          employees: 0,
          averageStress: 0,
          averageDependency: 0,
          highRiskCount: 0,
        };
      }
      acc[key].employees += 1;
      acc[key].averageStress += snapshot.stressLoad;
      acc[key].averageDependency += snapshot.systemDependency;
      if (snapshot.category === 'CRITICAL_RISK' || snapshot.category === 'PRESSURE_ZONE') {
        acc[key].highRiskCount += 1;
      }
      return acc;
    }, {})
  ).map((department) => ({
    ...department,
    averageStress: round(department.averageStress / Math.max(department.employees, 1)),
    averageDependency: round(department.averageDependency / Math.max(department.employees, 1)),
  }));

  return {
    summary,
    departments,
    snapshots,
  };
}

export async function getEmployeeSnapshotHistoryMap(
  prisma: PrismaClient,
  tenantId: string,
  perEmployee = 6
) {
  const rows = await prisma.$queryRaw<Array<{
    employeeId: string;
    createdAt: Date;
    stressLoad: number;
    productivity: number;
    systemDependency: number;
    confidence: number;
  }>>`
    SELECT
      ranked."employeeId",
      ranked."createdAt",
      ranked."stressLoad",
      ranked."productivity",
      ranked."systemDependency",
      ranked."confidence"
    FROM (
      SELECT
        snap.*,
        ROW_NUMBER() OVER (
          PARTITION BY snap."employeeId"
          ORDER BY snap."createdAt" DESC
        ) AS row_num
      FROM "EmployeeCapacitySnapshot" snap
      WHERE snap."tenantId" = ${tenantId}
    ) ranked
    WHERE ranked.row_num <= ${perEmployee}
    ORDER BY ranked."employeeId", ranked."createdAt" ASC
  `;

  return rows.reduce<Record<string, Array<{
    createdAt: string;
    stressLoad: number;
    productivity: number;
    systemDependency: number;
    confidence: number;
  }>>>((acc, row) => {
    if (!acc[row.employeeId]) {
      acc[row.employeeId] = [];
    }
    acc[row.employeeId].push({
      createdAt: row.createdAt.toISOString(),
      stressLoad: row.stressLoad,
      productivity: row.productivity,
      systemDependency: row.systemDependency,
      confidence: row.confidence,
    });
    return acc;
  }, {});
}
