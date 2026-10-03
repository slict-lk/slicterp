import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { getLatestDataReadinessAudit } from '../readiness/readiness-service';
import { getLatestWorkforceSnapshots } from '../workforce/capacity-service';
import { listOperationalEvents } from '../events/operational-event-service';

type ConstraintRecord = {
  id: string;
  tenantId: string;
  type: string;
  name: string;
  description: string | null;
  severity: number;
  confidence: number;
  status: string;
  linkedEmployeeId: string | null;
  linkedDepartmentId: string | null;
  linkedProcessKey: string | null;
  evidence: Record<string, unknown> | null;
  detectedAt: Date;
  resolvedAt: Date | null;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

export async function runConstraintScan(prisma: PrismaClient, tenantId: string) {
  const latestReadiness = await getLatestDataReadinessAudit(prisma, tenantId);
  if (!latestReadiness || latestReadiness.status !== 'PASS') {
    throw new Error('Data readiness gate is blocked. Pass readiness before scanning constraints.');
  }

  const snapshots = await getLatestWorkforceSnapshots(prisma, tenantId);
  if (snapshots.length === 0) {
    throw new Error('No workforce snapshots found. Generate Workforce DNA snapshots before scanning constraints.');
  }

  const [users, approvals, tasks, recentEvents] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, employeeId: { not: null }, isActive: true },
      select: { id: true, employeeId: true },
    }),
    prisma.salesOrderApproval.findMany({
      where: { tenantId },
      select: { id: true, approverUserId: true, status: true, salesOrderId: true },
    }),
    prisma.task.findMany({
      where: { tenantId },
      select: { id: true, assigneeId: true, dueDate: true, completedAt: true, status: true },
    }),
    listOperationalEvents(prisma, tenantId, { limit: 250 }),
  ]);

  await prisma.$executeRaw`
    DELETE FROM "TocConstraint"
    WHERE "tenantId" = ${tenantId}
      AND "status" = 'IDENTIFIED'
  `;

  const userByEmployeeId = new Map(users.map((user) => [user.employeeId as string, user.id]));
  const constraints: ConstraintRecord[] = [];
  const detectedAt = new Date();

  for (const snapshot of snapshots) {
    if (snapshot.stressLoad >= 75) {
      constraints.push({
        id: randomUUID(),
        tenantId,
        type: 'HUMAN',
        name: `${snapshot.firstName} ${snapshot.lastName} is overloaded`,
        description: 'High stress load detected from overdue tasks, overtime, and pending approvals.',
        severity: round(snapshot.stressLoad),
        confidence: round(snapshot.confidence),
        status: 'IDENTIFIED',
        linkedEmployeeId: snapshot.employeeId,
        linkedDepartmentId: snapshot.departmentId,
        linkedProcessKey: 'WORKFORCE_OVERLOAD',
        evidence: {
          category: snapshot.category,
          stressLoad: snapshot.stressLoad,
          systemDependency: snapshot.systemDependency,
          warnings: snapshot.warnings ?? [],
        },
        detectedAt,
        resolvedAt: null,
      });
    }

    if (snapshot.systemDependency >= 65 && snapshot.successionReadiness < 50) {
      constraints.push({
        id: randomUUID(),
        tenantId,
        type: 'SKILL',
        name: `${snapshot.firstName} ${snapshot.lastName} is a dependency hotspot`,
        description: 'One employee carries too much process dependency while backup coverage remains thin.',
        severity: round((snapshot.systemDependency + (100 - snapshot.successionReadiness)) / 2),
        confidence: round(snapshot.confidence),
        status: 'IDENTIFIED',
        linkedEmployeeId: snapshot.employeeId,
        linkedDepartmentId: snapshot.departmentId,
        linkedProcessKey: 'DEPENDENCY_CONCENTRATION',
        evidence: {
          systemDependency: snapshot.systemDependency,
          successionReadiness: snapshot.successionReadiness,
          departmentName: snapshot.departmentName,
        },
        detectedAt,
        resolvedAt: null,
      });
    }

    const userId = userByEmployeeId.get(snapshot.employeeId);
    if (userId) {
      const pendingApprovals = approvals.filter(
        (approval) => approval.approverUserId === userId && approval.status === 'PENDING'
      ).length;
      if (pendingApprovals >= 2) {
        constraints.push({
          id: randomUUID(),
          tenantId,
          type: 'DECISION',
          name: `${snapshot.firstName} ${snapshot.lastName} is an approval bottleneck`,
          description: 'Pending approval concentration is building around one decision owner.',
          severity: round(clamp((pendingApprovals * 20) + snapshot.systemDependency * 0.4)),
          confidence: round(clamp((snapshot.confidence * 0.7) + 20)),
          status: 'IDENTIFIED',
          linkedEmployeeId: snapshot.employeeId,
          linkedDepartmentId: snapshot.departmentId,
          linkedProcessKey: 'APPROVAL_CHAIN',
          evidence: {
            pendingApprovals,
            systemDependency: snapshot.systemDependency,
            recentEvents: recentEvents
              .filter((event) => event.actorUserId === userId || event.employeeId === snapshot.employeeId)
              .slice(0, 5),
          },
          detectedAt,
          resolvedAt: null,
        });
      }

      const overdueTasks = tasks.filter(
        (task) => task.assigneeId === userId && !task.completedAt && task.dueDate && task.dueDate < detectedAt
      ).length;
      if (overdueTasks >= 3) {
        constraints.push({
          id: randomUUID(),
          tenantId,
          type: 'PROCESS',
          name: `${snapshot.firstName} ${snapshot.lastName} has a task backlog`,
          description: 'Task throughput is slipping enough to create a local process constraint.',
          severity: round(clamp((overdueTasks * 15) + snapshot.stressLoad * 0.4)),
          confidence: round(snapshot.confidence),
          status: 'IDENTIFIED',
          linkedEmployeeId: snapshot.employeeId,
          linkedDepartmentId: snapshot.departmentId,
          linkedProcessKey: 'TASK_BACKLOG',
          evidence: {
            overdueTasks,
            stressLoad: snapshot.stressLoad,
            productivity: snapshot.productivity,
          },
          detectedAt,
          resolvedAt: null,
        });
      }
    }
  }

  const departments = snapshots.reduce<Record<string, {
    departmentId: string | null;
    departmentName: string;
    employees: number;
    avgStress: number;
    avgDependency: number;
    avgSuccession: number;
    avgConfidence: number;
    maxDependency: number;
  }>>((acc, snapshot) => {
    const key = snapshot.departmentId ?? 'unassigned';
    if (!acc[key]) {
      acc[key] = {
        departmentId: snapshot.departmentId,
        departmentName: snapshot.departmentName ?? 'Unassigned',
        employees: 0,
        avgStress: 0,
        avgDependency: 0,
        avgSuccession: 0,
        avgConfidence: 0,
        maxDependency: 0,
      };
    }
    acc[key].employees += 1;
    acc[key].avgStress += snapshot.stressLoad;
    acc[key].avgDependency += snapshot.systemDependency;
    acc[key].avgSuccession += snapshot.successionReadiness;
    acc[key].avgConfidence += snapshot.confidence;
    acc[key].maxDependency = Math.max(acc[key].maxDependency, snapshot.systemDependency);
    return acc;
  }, {});

  Object.values(departments).forEach((department) => {
    const averageStress = department.avgStress / Math.max(department.employees, 1);
    const averageDependency = department.avgDependency / Math.max(department.employees, 1);
    const averageSuccession = department.avgSuccession / Math.max(department.employees, 1);
    const averageConfidence = department.avgConfidence / Math.max(department.employees, 1);
    if (averageStress >= 60) {
      constraints.push({
        id: randomUUID(),
        tenantId,
        type: 'OPERATIONAL',
        name: `${department.departmentName} is under workload pressure`,
        description: 'Department-level workforce pressure indicates a broader operational constraint.',
        severity: round(clamp((averageStress * 0.7) + (averageDependency * 0.3))),
        confidence: 75,
        status: 'IDENTIFIED',
        linkedEmployeeId: null,
        linkedDepartmentId: department.departmentId,
        linkedProcessKey: 'DEPARTMENT_PRESSURE',
        evidence: {
          employees: department.employees,
          averageStress: round(averageStress),
          averageDependency: round(averageDependency),
          averageSuccession: round(averageSuccession),
        },
        detectedAt,
        resolvedAt: null,
      });
    }

    if ((department.employees <= 2 && department.maxDependency >= 55) || (averageDependency >= 55 && averageSuccession <= 45)) {
      constraints.push({
        id: randomUUID(),
        tenantId,
        type: 'SKILL',
        name: `${department.departmentName} has weak backup coverage`,
        description: 'The department does not have enough visible succession depth for its current dependency load.',
        severity: round(clamp((averageDependency * 0.55) + ((100 - averageSuccession) * 0.45))),
        confidence: round(clamp(averageConfidence)),
        status: 'IDENTIFIED',
        linkedEmployeeId: null,
        linkedDepartmentId: department.departmentId,
        linkedProcessKey: 'MISSING_BACKUP_COVERAGE',
        evidence: {
          employees: department.employees,
          averageDependency: round(averageDependency),
          averageSuccession: round(averageSuccession),
          maxDependency: round(department.maxDependency),
        },
        detectedAt,
        resolvedAt: null,
      });
    }
  });

  const approvalRequests = recentEvents.filter((event) => event.action === 'APPROVAL_REQUESTED');
  const approvalClosures = recentEvents.filter((event) => event.action === 'APPROVAL_APPROVED' || event.action === 'APPROVAL_REJECTED');
  const approvalGap = approvalRequests.length - approvalClosures.length;
  if (approvalRequests.length >= 3 && approvalGap >= 2) {
    constraints.push({
      id: randomUUID(),
      tenantId,
      type: 'DECISION',
      name: 'Approval requests are arriving faster than decisions',
      description: 'Operational events show approval demand outpacing recorded approval decisions.',
      severity: round(clamp(55 + (approvalGap * 8))),
      confidence: round(clamp(60 + Math.min(approvalRequests.length * 4, 25))),
      status: 'IDENTIFIED',
      linkedEmployeeId: null,
      linkedDepartmentId: null,
      linkedProcessKey: 'APPROVAL_EVENT_BACKLOG',
      evidence: {
        approvalRequests: approvalRequests.length,
        approvalClosures: approvalClosures.length,
        approvalGap,
        sampleEvents: approvalRequests.slice(0, 5),
      },
      detectedAt,
      resolvedAt: null,
    });
  }

  const longDurationEvents = recentEvents.filter((event) => Number(event.durationMs || 0) >= 8 * 60 * 60 * 1000);
  if (longDurationEvents.length >= 2) {
    constraints.push({
      id: randomUUID(),
      tenantId,
      type: 'PROCESS',
      name: 'Long-running operational events indicate process drag',
      description: 'Multiple events exceeded the operational duration threshold and may represent waiting time or cleanup effort.',
      severity: round(clamp(50 + (longDurationEvents.length * 6))),
      confidence: round(clamp(62 + (longDurationEvents.length * 4))),
      status: 'IDENTIFIED',
      linkedEmployeeId: null,
      linkedDepartmentId: null,
      linkedProcessKey: 'LONG_RUNNING_EVENTS',
      evidence: {
        thresholdHours: 8,
        eventCount: longDurationEvents.length,
        sampleEvents: longDurationEvents.slice(0, 5),
      },
      detectedAt,
      resolvedAt: null,
    });
  }

  const inventoryRollbacks = recentEvents.filter((event) => event.action === 'stock.transfer_rolled_back');
  if (inventoryRollbacks.length > 0) {
    constraints.push({
      id: randomUUID(),
      tenantId,
      type: 'OPERATIONAL',
      name: 'Inventory transfers are requiring rollback',
      description: 'Rollback events indicate warehouse transfer instability or destination receiving issues.',
      severity: round(clamp(58 + inventoryRollbacks.length * 10)),
      confidence: 82,
      status: 'IDENTIFIED',
      linkedEmployeeId: null,
      linkedDepartmentId: null,
      linkedProcessKey: 'INVENTORY_TRANSFER_ROLLBACK',
      evidence: {
        rollbackCount: inventoryRollbacks.length,
        sampleEvents: inventoryRollbacks.slice(0, 5),
      },
      detectedAt,
      resolvedAt: null,
    });
  }

  for (const constraint of constraints) {
    await prisma.$executeRaw`
      INSERT INTO "TocConstraint" (
        "id",
        "tenantId",
        "type",
        "name",
        "description",
        "severity",
        "confidence",
        "status",
        "linkedEmployeeId",
        "linkedDepartmentId",
        "linkedProcessKey",
        "evidence",
        "detectedAt",
        "resolvedAt"
      )
      VALUES (
        ${constraint.id},
        ${constraint.tenantId},
        ${constraint.type},
        ${constraint.name},
        ${constraint.description},
        ${constraint.severity},
        ${constraint.confidence},
        ${constraint.status},
        ${constraint.linkedEmployeeId},
        ${constraint.linkedDepartmentId},
        ${constraint.linkedProcessKey},
        ${JSON.stringify(constraint.evidence ?? null)}::jsonb,
        ${constraint.detectedAt},
        ${constraint.resolvedAt}
      )
    `;
  }

  return constraints;
}

export async function getActiveConstraints(prisma: PrismaClient, tenantId: string) {
  return prisma.$queryRaw<ConstraintRecord[]>`
    SELECT *
    FROM "TocConstraint"
    WHERE "tenantId" = ${tenantId}
      AND "status" = 'IDENTIFIED'
    ORDER BY "severity" DESC, "detectedAt" DESC
  `;
}
