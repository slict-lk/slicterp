import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { accessibleProjectWhere, ProjectActor, requireProjectAccess } from './access-policy';
import { queueManyProjectNotifications, queueProjectNotification } from './notifications';

const db = prisma as any;
const dateOrNull = (value: unknown) => value ? new Date(String(value)) : null;

async function activity(actor: ProjectActor, projectId: string, action: string, metadata?: Record<string, unknown>) {
  return db.projectActivity.create({ data: { tenantId: actor.tenantId, projectId, actorId: actor.id, action, metadata } });
}

export async function listProjectMembers(actor: ProjectActor, projectId: string) {
  await requireProjectAccess(actor, projectId, 'view');
  const members = await db.projectMember.findMany({ where: { tenantId: actor.tenantId, projectId, leftAt: null }, orderBy: { joinedAt: 'asc' } });
  const userIds = members.map((member: any) => member.userId).filter(Boolean);
  const employeeIds = members.map((member: any) => member.employeeId).filter(Boolean);
  const [users, employees] = await Promise.all([
    db.user.findMany({ where: { tenantId: actor.tenantId, id: { in: userIds } }, select: { id: true, name: true, email: true, avatar: true, employeeId: true } }),
    db.employee.findMany({ where: { tenantId: actor.tenantId, id: { in: employeeIds } }, select: { id: true, firstName: true, lastName: true, email: true, position: true } }),
  ]);
  return members.map((member: any) => ({ ...member, user: users.find((user: any) => user.id === member.userId) ?? null, employee: employees.find((employee: any) => employee.id === member.employeeId) ?? null }));
}

export async function addProjectMember(actor: ProjectActor, projectId: string, input: any) {
  await requireProjectAccess(actor, projectId, 'manage');
  if (!input.userId && !input.employeeId) throw new Error('A user or employee is required');
  if (input.userId) {
    const user = await db.user.findFirst({ where: { id: input.userId, tenantId: actor.tenantId, isActive: true } });
    if (!user) throw new Error('User not found');
  }
  if (input.employeeId) {
    const employee = await db.employee.findFirst({ where: { id: input.employeeId, tenantId: actor.tenantId, isActive: true } });
    if (!employee) throw new Error('Employee not found');
  }
  const member = await db.projectMember.create({ data: { tenantId: actor.tenantId, projectId, userId: input.userId ?? null, employeeId: input.employeeId ?? null, role: input.role, allocationPct: input.allocationPct } });
  await activity(actor, projectId, 'MEMBER_ADDED', { memberId: member.id, role: member.role, allocationPct: member.allocationPct });
  if (member.userId) await queueProjectNotification({ tenantId: actor.tenantId, recipientId: member.userId, eventType: 'PROJECT_MEMBER_ADDED', title: 'Added to project', message: 'You were added to a project.', link: `/projects/${projectId}` });
  return member;
}

export async function updateProjectMember(actor: ProjectActor, projectId: string, memberId: string, input: any) {
  await requireProjectAccess(actor, projectId, 'manage');
  const existing = await db.projectMember.findFirst({ where: { id: memberId, tenantId: actor.tenantId, projectId, leftAt: null } });
  if (!existing) throw new Error('Project member not found');
  const member = await db.projectMember.update({ where: { id: memberId }, data: { ...(input.role && { role: input.role }), ...(input.allocationPct != null && { allocationPct: input.allocationPct }), ...(input.remove && { leftAt: new Date() }) } });
  await activity(actor, projectId, input.remove ? 'MEMBER_REMOVED' : 'MEMBER_UPDATED', { memberId, role: member.role, allocationPct: member.allocationPct });
  return member;
}

export async function getResourcePlan(actor: ProjectActor, projectId: string) {
  await requireProjectAccess(actor, projectId, 'view');
  const members = await listProjectMembers(actor, projectId);
  const assignments = await db.task.findMany({ where: { tenantId: actor.tenantId, projectId, archivedAt: null, status: { notIn: ['DONE', 'CANCELLED'] } }, select: { assigneeId: true, estimatedHours: true, dueDate: true } });
  return members.map((member: any) => {
    const identities = [member.userId, member.employeeId].filter(Boolean);
    const assigned = assignments.filter((task: any) => identities.includes(task.assigneeId));
    const estimatedHours = assigned.reduce((sum: number, task: any) => sum + Number(task.estimatedHours || 0), 0);
    return { ...member, openItems: assigned.length, estimatedHours, overloaded: member.allocationPct > 100 || estimatedHours > 40 };
  });
}

export async function createMilestone(actor: ProjectActor, projectId: string, input: any) {
  await requireProjectAccess(actor, projectId, 'manage');
  const milestone = await db.projectMilestone.create({ data: { tenantId: actor.tenantId, projectId, name: input.name, description: input.description ?? null, dueDate: dateOrNull(input.dueDate), approvalStatus: input.approvalRequired ? 'PENDING' : 'NOT_REQUIRED', billableAmount: input.billableAmount ?? null } });
  await activity(actor, projectId, 'MILESTONE_CREATED', { milestoneId: milestone.id });
  return milestone;
}

export async function updateSprint(actor: ProjectActor, sprintId: string, input: any) {
  const sprint = await db.projectSprint.findFirst({ where: { id: sprintId, tenantId: actor.tenantId } });
  if (!sprint) throw new Error('Sprint not found');
  await requireProjectAccess(actor, sprint.projectId, 'manage');
  if (input.version && input.version !== sprint.version) throw new Error('Sprint was updated by another user');
  if (input.status === 'ACTIVE') {
    const active = await db.projectSprint.findFirst({ where: { tenantId: actor.tenantId, projectId: sprint.projectId, status: 'ACTIVE', id: { not: sprintId } } });
    if (active) throw new Error('Complete the active sprint before starting another');
  }
  const updated = await db.projectSprint.update({ where: { id: sprintId }, data: { ...(input.name !== undefined && { name: input.name }), ...(input.goal !== undefined && { goal: input.goal }), ...(input.startDate !== undefined && { startDate: dateOrNull(input.startDate) }), ...(input.endDate !== undefined && { endDate: dateOrNull(input.endDate) }), ...(input.status !== undefined && { status: input.status, completedAt: input.status === 'COMPLETED' ? new Date() : null }), version: { increment: 1 } } });
  if (input.status === 'COMPLETED' && input.carryForwardToSprintId) {
    const target = await db.projectSprint.findFirst({ where: { id: input.carryForwardToSprintId, tenantId: actor.tenantId, projectId: sprint.projectId } });
    if (!target) throw new Error('Carry-forward sprint not found');
    await db.task.updateMany({ where: { tenantId: actor.tenantId, projectId: sprint.projectId, sprintId, status: { notIn: ['DONE', 'CANCELLED'] } }, data: { sprintId: target.id, version: { increment: 1 } } });
  }
  await activity(actor, sprint.projectId, `SPRINT_${String(input.status || 'UPDATED')}`, { sprintId, carryForwardToSprintId: input.carryForwardToSprintId });
  return updated;
}

export async function updateMilestone(actor: ProjectActor, projectId: string, milestoneId: string, input: any) {
  await requireProjectAccess(actor, projectId, input.approve ? 'manage' : 'manage');
  const existing = await db.projectMilestone.findFirst({ where: { id: milestoneId, tenantId: actor.tenantId, projectId } });
  if (!existing) throw new Error('Milestone not found');
  if (input.version && input.version !== existing.version) throw new Error('Milestone was updated by another user');
  const milestone = await db.projectMilestone.update({ where: { id: milestoneId }, data: { ...(input.name !== undefined && { name: input.name }), ...(input.description !== undefined && { description: input.description }), ...(input.dueDate !== undefined && { dueDate: dateOrNull(input.dueDate) }), ...(input.status !== undefined && { status: input.status, completedAt: input.status === 'COMPLETED' ? new Date() : null }), ...(input.billableAmount !== undefined && { billableAmount: input.billableAmount }), ...(input.approve && { approvalStatus: 'APPROVED', approvedById: actor.id, approvedAt: new Date() }), version: { increment: 1 } } });
  await activity(actor, projectId, input.approve ? 'MILESTONE_APPROVED' : 'MILESTONE_UPDATED', { milestoneId });
  return milestone;
}

export async function updateWorkflow(actor: ProjectActor, projectId: string, statuses: any[]) {
  await requireProjectAccess(actor, projectId, 'manage');
  const keys = new Set(statuses.map((status) => status.key));
  if (keys.size !== statuses.length) throw new Error('Workflow keys must be unique');
  await db.$transaction(async (tx: any) => {
    for (const [position, status] of statuses.entries()) {
      await tx.projectWorkflowStatus.upsert({
        where: { projectId_key: { projectId, key: status.key } },
        update: { name: status.name, category: status.category, color: status.color, position, allowedTransitions: status.allowedTransitions ?? [], version: { increment: 1 } },
        create: { tenantId: actor.tenantId, projectId, key: status.key, name: status.name, category: status.category, color: status.color, position, allowedTransitions: status.allowedTransitions ?? [] },
      });
    }
  });
  await activity(actor, projectId, 'WORKFLOW_UPDATED', { statusKeys: [...keys] });
  return db.projectWorkflowStatus.findMany({ where: { tenantId: actor.tenantId, projectId }, orderBy: { position: 'asc' } });
}

export async function transitionWorkItem(actor: ProjectActor, taskId: string, targetKey: string, rank?: number) {
  const task = await db.task.findFirst({ where: { id: taskId, tenantId: actor.tenantId } });
  if (!task) throw new Error('Work item not found');
  await requireProjectAccess(actor, task.projectId, 'contribute');
  const [source, target] = await Promise.all([
    db.projectWorkflowStatus.findFirst({ where: { tenantId: actor.tenantId, projectId: task.projectId, key: task.workflowStatusKey || task.status } }),
    db.projectWorkflowStatus.findFirst({ where: { tenantId: actor.tenantId, projectId: task.projectId, key: targetKey } }),
  ]);
  if (!target) throw new Error('Target workflow status not found');
  if (source?.allowedTransitions?.length && !source.allowedTransitions.includes(targetKey)) throw new Error(`Transition from ${source.key} to ${targetKey} is not allowed`);
  const status = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'].includes(target.category) ? target.category : task.status;
  const updated = await db.task.update({ where: { id: taskId }, data: { workflowStatusKey: targetKey, status, ...(rank != null && { rank }), completedAt: status === 'DONE' ? new Date() : null, version: { increment: 1 } } });
  await db.taskActivity.create({ data: { tenantId: actor.tenantId, taskId, actorId: actor.id, action: 'STATUS_CHANGED', metadata: { from: source?.key ?? task.status, to: targetKey } } });
  await notifyTaskFollowers(actor, taskId, 'WORK_ITEM_STATUS_CHANGED', 'Work item status changed', `${task.title} moved to ${target.name}`);
  return updated;
}

export async function addWatcher(actor: ProjectActor, taskId: string, userId: string) {
  const task = await db.task.findFirst({ where: { id: taskId, tenantId: actor.tenantId } });
  if (!task) throw new Error('Work item not found');
  await requireProjectAccess(actor, task.projectId, 'view');
  const user = await db.user.findFirst({ where: { id: userId, tenantId: actor.tenantId, isActive: true } });
  if (!user) throw new Error('User not found');
  return db.taskWatcher.upsert({ where: { taskId_userId: { taskId, userId } }, update: {}, create: { tenantId: actor.tenantId, taskId, userId } });
}

export async function addDependency(actor: ProjectActor, taskId: string, dependsOnId: string, type = 'BLOCKED_BY') {
  const [task, dependency] = await Promise.all([
    db.task.findFirst({ where: { id: taskId, tenantId: actor.tenantId } }),
    db.task.findFirst({ where: { id: dependsOnId, tenantId: actor.tenantId } }),
  ]);
  if (!task || !dependency || task.projectId !== dependency.projectId || task.id === dependency.id) throw new Error('Invalid dependency');
  await requireProjectAccess(actor, task.projectId, 'contribute');
  await assertNoCircularDependency(actor.tenantId, taskId, dependsOnId);
  return db.taskDependency.upsert({ where: { taskId_dependsOnId: { taskId, dependsOnId } }, update: { type }, create: { tenantId: actor.tenantId, taskId, dependsOnId, type } });
}

async function assertNoCircularDependency(tenantId: string, taskId: string, dependsOnId: string) {
  const visited = new Set<string>();
  let frontier = [dependsOnId];
  while (frontier.length) {
    if (frontier.includes(taskId)) throw new Error('Circular dependency detected');
    const unseen = frontier.filter((id) => !visited.has(id));
    unseen.forEach((id) => visited.add(id));
    if (!unseen.length) return;
    const edges = await db.taskDependency.findMany({ where: { tenantId, taskId: { in: unseen } }, select: { dependsOnId: true } });
    frontier = edges.map((edge: any) => edge.dependsOnId);
  }
}

export async function bulkUpdateWorkItems(actor: ProjectActor, input: any) {
  const tasks = await db.task.findMany({ where: { tenantId: actor.tenantId, id: { in: input.ids } }, select: { id: true, projectId: true } });
  if (tasks.length !== input.ids.length) throw new Error('One or more work items were not found');
  for (const projectId of [...new Set(tasks.map((task: any) => task.projectId))]) await requireProjectAccess(actor, projectId as string, 'contribute');
  if (input.targetKey) {
    for (const task of tasks) await transitionWorkItem(actor, task.id, input.targetKey);
    return { count: tasks.length };
  }
  const data: any = {};
  for (const key of ['priority', 'sprintId', 'assigneeId', 'archivedAt']) if (input[key] !== undefined) data[key] = input[key];
  if (input.archive !== undefined) data.archivedAt = input.archive ? new Date() : null;
  if (!Object.keys(data).length) throw new Error('No bulk update fields provided');
  return db.task.updateMany({ where: { tenantId: actor.tenantId, id: { in: input.ids } }, data: { ...data, version: { increment: 1 } } });
}

export async function submitTimesheet(actor: ProjectActor, timesheetId: string) {
  const entry = await db.timesheet.findFirst({ where: { id: timesheetId, tenantId: actor.tenantId } });
  if (!entry?.projectId) throw new Error('Timesheet not found');
  await requireProjectAccess(actor, entry.projectId, 'contribute');
  if (!['DRAFT', 'REJECTED'].includes(entry.approvalStatus)) throw new Error('Timesheet cannot be submitted');
  return db.timesheet.update({ where: { id: timesheetId }, data: { approvalStatus: 'SUBMITTED', submittedAt: new Date(), rejectionReason: null, version: { increment: 1 } } });
}

export async function reviewTimesheet(actor: ProjectActor, timesheetId: string, approve: boolean, reason?: string) {
  const entry = await db.timesheet.findFirst({ where: { id: timesheetId, tenantId: actor.tenantId } });
  if (!entry?.projectId) throw new Error('Timesheet not found');
  await requireProjectAccess(actor, entry.projectId, 'approve_time');
  if (entry.approvalStatus !== 'SUBMITTED') throw new Error('Only submitted timesheets can be reviewed');
  return db.timesheet.update({ where: { id: timesheetId }, data: approve ? { approvalStatus: 'APPROVED', approvedById: actor.id, approvedAt: new Date(), lockedAt: new Date(), version: { increment: 1 } } : { approvalStatus: 'REJECTED', rejectedById: actor.id, rejectedAt: new Date(), rejectionReason: reason || 'Changes requested', version: { increment: 1 } } });
}

export async function createProjectDraftInvoice(actor: ProjectActor, projectId: string) {
  await requireProjectAccess(actor, projectId, 'bill');
  const project = await db.project.findFirst({ where: { id: projectId, tenantId: actor.tenantId } });
  if (!project?.customerId) throw new Error('Project customer is required before billing');
  if (project.billingType === 'INTERNAL') throw new Error('Internal projects cannot be billed');

  const sources = project.billingType === 'TIME_AND_MATERIALS'
    ? await db.timesheet.findMany({ where: { tenantId: actor.tenantId, projectId, approvalStatus: 'APPROVED', billable: true, billingBatchId: null } })
    : await db.projectMilestone.findMany({ where: { tenantId: actor.tenantId, projectId, approvalStatus: 'APPROVED', billableAmount: { not: null } } });
  if (!sources.length) throw new Error('No approved unbilled sources found');
  const sourceIds = sources.map((source: any) => source.id).sort();
  const idempotencyKey = createHash('sha256').update(`${projectId}:${project.billingType}:${sourceIds.join(',')}`).digest('hex');
  const existing = await db.projectBillingBatch.findUnique({ where: { tenantId_idempotencyKey: { tenantId: actor.tenantId, idempotencyKey } } });
  if (existing) return existing;
  const lines = sources.map((source: any) => project.billingType === 'TIME_AND_MATERIALS'
    ? { description: source.description || `Project time ${source.date.toISOString().slice(0, 10)}`, quantity: Number(source.hours), unitPrice: Number(source.hourlyRate || project.defaultBillingRate || 0), total: Number(source.billableAmount || Number(source.hours) * Number(source.hourlyRate || project.defaultBillingRate || 0)) }
    : { description: `Milestone: ${source.name}`, quantity: 1, unitPrice: Number(source.billableAmount || 0), total: Number(source.billableAmount || 0) });
  const total = lines.reduce((sum: number, line: any) => sum + line.total, 0);
  if (total <= 0) throw new Error('Billable amount must be greater than zero');

  return db.$transaction(async (tx: any) => {
    const invoice = await tx.invoice.create({
      data: {
        number: `PRJ-${project.code}-${Date.now()}`,
        type: 'SALES', status: 'DRAFT', customerId: project.customerId, issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 86400000), subtotal: total, tax: 0, discount: 0, total,
        amountPaid: 0, amountDue: total, notes: `Draft invoice generated from project ${project.name}`,
        tenantId: actor.tenantId, currencyCode: project.currency, exchangeRate: 1, baseCurrencyTotal: total,
        lines: { create: lines.map((line: any) => ({ ...line, tax: 0, discount: 0 })) },
      },
    });
    const batch = await tx.projectBillingBatch.create({ data: { tenantId: actor.tenantId, projectId, invoiceId: invoice.id, idempotencyKey, billingType: project.billingType, amount: total, currency: project.currency, sourceIds, createdById: actor.id } });
    if (project.billingType === 'TIME_AND_MATERIALS') await tx.timesheet.updateMany({ where: { id: { in: sourceIds }, tenantId: actor.tenantId }, data: { approvalStatus: 'INVOICED', billingBatchId: batch.id, lockedAt: new Date() } });
    await tx.projectActivity.create({ data: { tenantId: actor.tenantId, projectId, actorId: actor.id, action: 'DRAFT_INVOICE_CREATED', metadata: { invoiceId: invoice.id, billingBatchId: batch.id, amount: total } } });
    return batch;
  });
}

export async function getProjectReports(actor: ProjectActor, projectId?: string) {
  const projectWhere = projectId ? { id: projectId } : accessibleProjectWhere(actor);
  if (projectId) await requireProjectAccess(actor, projectId, 'view');
  const [projects, tasks, timesheets, milestones] = await Promise.all([
    db.project.findMany({ where: { ...projectWhere, archivedAt: null }, select: { id: true, name: true, code: true, status: true, budget: true, currency: true } }),
    db.task.findMany({ where: { tenantId: actor.tenantId, archivedAt: null, ...(projectId ? { projectId } : { project: accessibleProjectWhere(actor) }) }, select: { projectId: true, type: true, status: true, priority: true, severity: true, estimatedHours: true, actualHours: true, createdAt: true, completedAt: true, dueDate: true, sprintId: true } }),
    db.timesheet.findMany({ where: { tenantId: actor.tenantId, ...(projectId ? { projectId } : { project: accessibleProjectWhere(actor) }) }, select: { projectId: true, hours: true, costAmount: true, billableAmount: true, billable: true, approvalStatus: true } }),
    db.projectMilestone.findMany({ where: { tenantId: actor.tenantId, ...(projectId ? { projectId } : { project: accessibleProjectWhere(actor) }) }, select: { projectId: true, status: true, dueDate: true, completedAt: true, approvalStatus: true } }),
  ]);
  const now = new Date();
  return {
    projects,
    summary: {
      totalProjects: projects.length,
      openItems: tasks.filter((task: any) => !['DONE', 'CANCELLED'].includes(task.status)).length,
      overdueItems: tasks.filter((task: any) => !['DONE', 'CANCELLED'].includes(task.status) && task.dueDate && task.dueDate < now).length,
      completedItems: tasks.filter((task: any) => task.status === 'DONE').length,
      bugs: tasks.filter((task: any) => task.type === 'BUG').length,
      trackedHours: timesheets.reduce((sum: number, entry: any) => sum + Number(entry.hours), 0),
      billableHours: timesheets.filter((entry: any) => entry.billable).reduce((sum: number, entry: any) => sum + Number(entry.hours), 0),
      cost: timesheets.reduce((sum: number, entry: any) => sum + Number(entry.costAmount || 0), 0),
      revenue: timesheets.reduce((sum: number, entry: any) => sum + Number(entry.billableAmount || 0), 0),
      milestonesCompleted: milestones.filter((milestone: any) => milestone.status === 'COMPLETED').length,
      milestonesTotal: milestones.length,
    },
  };
}

export async function listSavedViews(actor: ProjectActor, projectId: string) {
  await requireProjectAccess(actor, projectId, 'view');
  return db.projectSavedView.findMany({
    where: { tenantId: actor.tenantId, projectId, OR: [{ ownerId: actor.id }, { isShared: true }] },
    orderBy: [{ isShared: 'desc' }, { name: 'asc' }],
  });
}

export async function saveProjectView(actor: ProjectActor, projectId: string, input: any) {
  await requireProjectAccess(actor, projectId, 'view');
  return db.projectSavedView.upsert({
    where: { projectId_ownerId_name: { projectId, ownerId: actor.id, name: input.name } },
    update: { viewType: input.viewType, filters: input.filters, isShared: Boolean(input.isShared) },
    create: { tenantId: actor.tenantId, projectId, ownerId: actor.id, name: input.name, viewType: input.viewType, filters: input.filters, isShared: Boolean(input.isShared) },
  });
}

export async function deleteSavedView(actor: ProjectActor, projectId: string, viewId: string) {
  await requireProjectAccess(actor, projectId, 'view');
  const view = await db.projectSavedView.findFirst({ where: { id: viewId, tenantId: actor.tenantId, projectId, ownerId: actor.id } });
  if (!view) throw new Error('Saved view not found');
  await db.projectSavedView.delete({ where: { id: viewId } });
  return { deleted: true };
}

async function notifyTaskFollowers(actor: ProjectActor, taskId: string, eventType: string, title: string, message: string) {
  const task = await db.task.findFirst({ where: { id: taskId, tenantId: actor.tenantId }, include: { watchers: true } });
  if (!task) return;
  const recipients = [...new Set([task.reporterId, ...task.watchers.map((watcher: any) => watcher.userId)].filter((id) => id && id !== actor.id))] as string[];
  await queueManyProjectNotifications(recipients.map((recipientId) => ({ tenantId: actor.tenantId, recipientId, eventType, title, message, link: `/projects/tasks/${taskId}` })));
}
