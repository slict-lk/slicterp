import { prisma } from '@/lib/prisma';
import { recordOperationalEvent } from '@/lib/intelligence/events/operational-event-service';
import { getProjectTemplate, PROJECT_TEMPLATES } from './templates';
import { accessibleProjectWhere, ProjectActor, requireProjectAccess } from './access-policy';
import { extractMentionEmails, queueManyProjectNotifications, queueProjectNotification } from './notifications';

const db = prisma as any;
const dateOrNull = (value: unknown) => value ? new Date(String(value)) : null;

async function event(tenantId: string, actorId: string | undefined, entityType: string, entityId: string, action: string, metadata?: Record<string, unknown>) {
  await recordOperationalEvent(prisma, { tenantId, moduleKey: 'projects', entityType, entityId, action, actorUserId: actorId, metadata });
}

export async function ensureProjectTemplates(tenantId: string) {
  // Keep initialization sequential because managed Postgres connections are
  // intentionally pooled very tightly in this application.
  for (const template of PROJECT_TEMPLATES) {
    await db.projectTemplate.upsert({
      where: { tenantId_key: { tenantId, key: template.key } },
      update: { name: template.name, description: template.description, category: template.category, icon: template.icon, config: template, isSystem: true },
      create: { tenantId, key: template.key, name: template.name, description: template.description, category: template.category, icon: template.icon, config: template, isSystem: true },
    });
  }
  return db.projectTemplate.findMany({ where: { tenantId, isActive: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
}

async function resolveTenantProjectTemplate(tenantId: string, key?: string | null) {
  const stored = key ? await db.projectTemplate.findFirst({ where: { tenantId, key, isActive: true } }) : null;
  if (stored?.config && typeof stored.config === 'object') {
    const config = stored.config as any;
    if (Array.isArray(config.workflow) && Array.isArray(config.workItemTypes) && config.features) {
      return { ...config, key: stored.key, name: stored.name, description: stored.description ?? config.description, category: stored.category, icon: stored.icon ?? config.icon };
    }
  }
  return getProjectTemplate(key);
}

export async function getProjectsOverview(actor: ProjectActor) {
  const tenantId = actor.tenantId;
  const projectAccess = accessibleProjectWhere(actor);
  const now = new Date();
  const [projects, tasks, members, time] = await Promise.all([
    db.project.findMany({
      where: { ...projectAccess, archivedAt: null },
      include: { tasks: { where: { archivedAt: null }, select: { status: true } }, _count: { select: { tasks: true, members: true, milestones: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    db.task.findMany({ where: { tenantId, archivedAt: null, project: projectAccess }, include: { project: { select: { id: true, name: true, code: true } } }, orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }], take: 200 }),
    db.projectMember.count({ where: { tenantId, leftAt: null, project: projectAccess } }),
    db.timesheet.aggregate({ where: { tenantId, project: projectAccess }, _sum: { hours: true, billableAmount: true, costAmount: true } }),
  ]);
  const openTasks = tasks.filter((task: any) => !['DONE', 'CANCELLED'].includes(task.status));
  return {
    projects,
    tasks,
    metrics: {
      activeProjects: projects.filter((project: any) => project.status === 'IN_PROGRESS').length,
      totalProjects: projects.length,
      openWorkItems: openTasks.length,
      overdueWorkItems: openTasks.filter((task: any) => task.dueDate && task.dueDate < now).length,
      completedWorkItems: tasks.filter((task: any) => task.status === 'DONE').length,
      teamMembers: members,
      totalBudget: projects.reduce((sum: number, project: any) => sum + Number(project.budget || 0), 0),
      trackedHours: Number(time._sum.hours || 0),
      billableAmount: Number(time._sum.billableAmount || 0),
      costAmount: Number(time._sum.costAmount || 0),
    },
  };
}

export async function listProjects(actor: ProjectActor, filters: Record<string, string | undefined>) {
  return db.project.findMany({
    where: {
      ...accessibleProjectWhere(actor),
      archivedAt: filters.archived === 'true' ? { not: null } : null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search ? { OR: [{ name: { contains: filters.search, mode: 'insensitive' } }, { code: { contains: filters.search, mode: 'insensitive' } }] } : {}),
    },
    include: { _count: { select: { tasks: true, members: true, milestones: true } } },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getProject(actor: ProjectActor, id: string) {
  await requireProjectAccess(actor, id, 'view');
  return db.project.findFirst({
    where: { id, tenantId: actor.tenantId },
    include: {
      tasks: { where: { archivedAt: null }, orderBy: [{ rank: 'asc' }, { createdAt: 'desc' }], include: { _count: { select: { comments: true, checklists: true, attachments: true } } } },
      members: { where: { leftAt: null } },
      milestones: { orderBy: { dueDate: 'asc' } },
      sprints: { orderBy: { createdAt: 'desc' } },
      workflowStatuses: { orderBy: { position: 'asc' } },
      attachments: { orderBy: { createdAt: 'desc' } },
      activities: { orderBy: { createdAt: 'desc' }, take: 100 },
      billingBatches: { orderBy: { createdAt: 'desc' }, take: 20 },
      timesheets: { orderBy: { date: 'desc' }, take: 100 },
      _count: { select: { tasks: true, members: true, milestones: true } },
    },
  });
}

export async function createProject(actor: ProjectActor, data: any) {
  const { tenantId, id: actorId } = actor;
  const template = await resolveTenantProjectTemplate(tenantId, data.templateKey);
  const code = data.code || `PRJ-${Date.now().toString().slice(-8)}`;
  const project = await db.$transaction(async (tx: any) => {
    const created = await tx.project.create({
      data: {
        tenantId, code, name: data.name, description: data.description ?? null, status: data.status,
        visibility: data.visibility, templateKey: template.key, templateSnapshot: template,
        startDate: dateOrNull(data.startDate), endDate: dateOrNull(data.endDate), budget: data.budget ?? null,
        currency: data.currency, customerId: data.customerId ?? null, managerId: data.managerId ?? null,
        billingType: data.billingType, defaultBillingRate: data.defaultBillingRate ?? null, defaultCostRate: data.defaultCostRate ?? null,
      },
    });
    await tx.projectMember.create({ data: { tenantId, projectId: created.id, userId: actorId, role: 'MANAGER' } });
    await tx.projectWorkflowStatus.createMany({
      data: template.workflow.map((status: { key: string; name: string; category: string; color: string; allowedTransitions?: string[] }, position: number) => ({ tenantId, projectId: created.id, ...status, position, isDefault: position === 0 })),
    });
    return created;
  });
  await event(tenantId, actorId, 'PROJECT', project.id, 'PROJECT_CREATED', { templateKey: template.key, code });
  return getProject(actor, project.id);
}

export async function updateProject(actor: ProjectActor, id: string, data: any) {
  const { tenantId, id: actorId } = actor;
  await requireProjectAccess(actor, id, 'manage');
  const existing = await db.project.findFirst({ where: { id, tenantId } });
  if (!existing) throw new Error('Project not found');
  if (data.version && data.version !== existing.version) throw new Error('Project was updated by another user');
  const updated = await db.project.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.visibility !== undefined && { visibility: data.visibility }),
      ...(data.startDate !== undefined && { startDate: dateOrNull(data.startDate) }),
      ...(data.endDate !== undefined && { endDate: dateOrNull(data.endDate) }),
      ...(data.budget !== undefined && { budget: data.budget }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.customerId !== undefined && { customerId: data.customerId }),
      ...(data.managerId !== undefined && { managerId: data.managerId }),
      ...(data.billingType !== undefined && { billingType: data.billingType }),
      ...(data.defaultBillingRate !== undefined && { defaultBillingRate: data.defaultBillingRate }),
      ...(data.defaultCostRate !== undefined && { defaultCostRate: data.defaultCostRate }),
      ...(data.archived !== undefined && { archivedAt: data.archived ? new Date() : null }),
      version: { increment: 1 },
    },
  });
  await event(tenantId, actorId, 'PROJECT', id, data.archived ? 'PROJECT_ARCHIVED' : 'PROJECT_UPDATED');
  return updated;
}

export async function listWorkItems(actor: ProjectActor, filters: Record<string, string | undefined>, page?: { cursor?: string; limit?: number }) {
  const tenantId = actor.tenantId;
  const limit = Math.min(Math.max(page?.limit ?? 50, 1), 100);
  return db.task.findMany({
    where: {
      tenantId, project: accessibleProjectWhere(actor), archivedAt: filters.archived === 'true' ? { not: null } : null,
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(filters.search ? { OR: [{ title: { contains: filters.search, mode: 'insensitive' } }, { description: { contains: filters.search, mode: 'insensitive' } }] } : {}),
    },
    include: { project: { select: { id: true, name: true, code: true, templateKey: true } }, sprint: true, milestone: true, _count: { select: { comments: true, checklists: true, attachments: true } } },
    orderBy: [{ rank: 'asc' }, { createdAt: 'desc' }],
    take: limit + 1,
    ...(page?.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
  });
}

export async function getMyWork(tenantId: string, userId: string, employeeId?: string | null) {
  const identityIds = [userId, employeeId].filter(Boolean) as string[];
  const items = await db.task.findMany({
    where: {
      tenantId,
      archivedAt: null,
      OR: [
        { assigneeId: { in: identityIds } },
        { assignees: { some: { OR: [{ userId }, ...(employeeId ? [{ employeeId }] : [])] } } },
      ],
    },
    include: {
      project: { select: { id: true, name: true, code: true, templateKey: true } },
      sprint: true,
      milestone: true,
      _count: { select: { comments: true, checklists: true, attachments: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
  });
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const open = items.filter((item: any) => !['DONE', 'CANCELLED'].includes(item.status));
  return {
    items,
    metrics: {
      open: open.length,
      overdue: open.filter((item: any) => item.dueDate && item.dueDate < startOfToday).length,
      dueToday: open.filter((item: any) => item.dueDate && item.dueDate >= startOfToday && item.dueDate < endOfToday).length,
      completed: items.filter((item: any) => item.status === 'DONE').length,
    },
  };
}

export async function getWorkItem(actor: ProjectActor, id: string) {
  const task = await db.task.findFirst({ where: { id, tenantId: actor.tenantId }, select: { projectId: true } });
  if (!task) return null;
  await requireProjectAccess(actor, task.projectId, 'view');
  return db.task.findFirst({
    where: { id, tenantId: actor.tenantId },
    include: { project: true, sprint: true, milestone: true, assignees: true, watchers: true, comments: { orderBy: { createdAt: 'asc' } }, checklists: { orderBy: { position: 'asc' } }, attachments: true, dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true } } } }, dependents: true, activities: { orderBy: { createdAt: 'desc' }, take: 100 }, subtasks: true },
  });
}

export async function createWorkItem(actor: ProjectActor, data: any) {
  const { tenantId, id: actorId } = actor;
  const project = await db.project.findFirst({ where: { id: data.projectId, tenantId, archivedAt: null } });
  if (!project) throw new Error('Project not found');
  await requireProjectAccess(actor, project.id, 'contribute');
  await validateWorkItemReferences(tenantId, project.id, data);
  const last = await db.task.aggregate({ where: { tenantId, projectId: project.id }, _max: { sequenceNumber: true, rank: true } });
  const task = await db.task.create({
    data: {
      tenantId, projectId: project.id, title: data.title, description: data.description ?? null, type: data.type,
      priority: data.priority, status: data.status, workflowStatusKey: data.workflowStatusKey || data.status,
      assigneeId: data.assigneeId ?? null, reporterId: data.reporterId ?? actorId, parentId: data.parentId ?? null,
      sprintId: data.sprintId ?? null, milestoneId: data.milestoneId ?? null, severity: data.severity ?? null,
      storyPoints: data.storyPoints ?? null, startDate: dateOrNull(data.startDate), dueDate: dateOrNull(data.dueDate),
      estimatedHours: data.estimatedHours ?? null, environment: data.environment ?? null,
      reproductionSteps: data.reproductionSteps ?? null, expectedResult: data.expectedResult ?? null,
      actualResult: data.actualResult ?? null, releaseVersion: data.releaseVersion ?? null, customFields: data.customFields ?? null,
      labels: data.labels ?? [], acceptanceCriteria: data.acceptanceCriteria ?? null,
      sequenceNumber: Number(last._max.sequenceNumber || 0) + 1, rank: Number(last._max.rank || 0) + 1000,
    },
  });
  await db.taskActivity.create({ data: { tenantId, taskId: task.id, actorId, action: 'CREATED', metadata: { type: task.type, priority: task.priority } } });
  await event(tenantId, actorId, 'TASK', task.id, 'TASK_CREATED', { projectId: project.id, type: task.type, priority: task.priority, assigneeId: task.assigneeId });
  if (task.assigneeId) {
    const assigneeUser = await db.user.findFirst({ where: { tenantId, OR: [{ id: task.assigneeId }, { employeeId: task.assigneeId }] }, select: { id: true } });
    if (assigneeUser?.id && assigneeUser.id !== actorId) await queueProjectNotification({ tenantId, recipientId: assigneeUser.id, eventType: 'WORK_ITEM_ASSIGNED', title: 'Work assigned to you', message: task.title, link: `/projects/tasks/${task.id}` });
  }
  return getWorkItem(actor, task.id);
}

export async function updateWorkItem(actor: ProjectActor, id: string, data: any) {
  const { tenantId, id: actorId } = actor;
  const existing = await db.task.findFirst({ where: { id, tenantId } });
  if (!existing) throw new Error('Work item not found');
  await requireProjectAccess(actor, existing.projectId, 'contribute');
  if (data.version && data.version !== existing.version) throw new Error('Work item was updated by another user');
  await validateWorkItemReferences(tenantId, existing.projectId, data, id);
  const completedAt = data.status === 'DONE' ? new Date() : data.status && data.status !== 'DONE' ? null : undefined;
  const updated = await db.task.update({
    where: { id },
    data: {
      ...Object.fromEntries(Object.entries(data).filter(([key]) => !['version', 'archived', 'startDate', 'dueDate'].includes(key))),
      ...(data.startDate !== undefined && { startDate: dateOrNull(data.startDate) }),
      ...(data.dueDate !== undefined && { dueDate: dateOrNull(data.dueDate) }),
      ...(completedAt !== undefined && { completedAt }),
      ...(data.archived !== undefined && { archivedAt: data.archived ? new Date() : null }),
      version: { increment: 1 },
    },
  });
  await db.taskActivity.create({ data: { tenantId, taskId: id, actorId, action: existing.status !== updated.status ? 'STATUS_CHANGED' : 'UPDATED', metadata: { fromStatus: existing.status, toStatus: updated.status } } });
  await event(tenantId, actorId, 'TASK', id, existing.status !== updated.status ? 'TASK_STATUS_CHANGED' : 'TASK_UPDATED', { projectId: existing.projectId, fromStatus: existing.status, toStatus: updated.status });
  return getWorkItem(actor, id);
}

async function validateWorkItemReferences(tenantId: string, projectId: string, data: any, currentTaskId?: string) {
  const checks: Array<Promise<any>> = [];
  if (data.sprintId) checks.push(db.projectSprint.findFirst({ where: { id: data.sprintId, tenantId, projectId } }).then((value: any) => { if (!value) throw new Error('Sprint not found'); }));
  if (data.milestoneId) checks.push(db.projectMilestone.findFirst({ where: { id: data.milestoneId, tenantId, projectId } }).then((value: any) => { if (!value) throw new Error('Milestone not found'); }));
  if (data.parentId) {
    if (data.parentId === currentTaskId) throw new Error('A work item cannot be its own parent');
    checks.push(db.task.findFirst({ where: { id: data.parentId, tenantId, projectId } }).then((value: any) => { if (!value) throw new Error('Parent work item not found'); }));
  }
  if (data.assigneeId) checks.push(Promise.all([
    db.user.findFirst({ where: { id: data.assigneeId, tenantId, isActive: true } }),
    db.employee.findFirst({ where: { id: data.assigneeId, tenantId, isActive: true } }),
  ]).then(([user, employee]) => { if (!user && !employee) throw new Error('Assignee not found'); }));
  await Promise.all(checks);
}

export async function addTaskComment(actor: ProjectActor, taskId: string, body: string) {
  const { tenantId, id: actorId } = actor;
  const task = await db.task.findFirst({ where: { id: taskId, tenantId } });
  if (!task) throw new Error('Work item not found');
  await requireProjectAccess(actor, task.projectId, 'contribute');
  const emails = extractMentionEmails(body);
  const mentionedUsers = emails.length ? await db.user.findMany({ where: { tenantId, email: { in: emails }, isActive: true }, select: { id: true, email: true } }) : [];
  const comment = await db.taskComment.create({ data: { tenantId, taskId, authorId: actorId, body, mentions: mentionedUsers.map((user: any) => ({ userId: user.id, email: user.email })) } });
  await db.taskActivity.create({ data: { tenantId, taskId, actorId, action: 'COMMENTED', metadata: { commentId: comment.id } } });
  await event(tenantId, actorId, 'TASK', taskId, 'TASK_COMMENTED', { projectId: task.projectId });
  await queueManyProjectNotifications(mentionedUsers.filter((user: any) => user.id !== actorId).map((user: any) => ({ tenantId, recipientId: user.id, eventType: 'PROJECT_MENTION', title: 'You were mentioned', message: body.slice(0, 180), link: `/projects/tasks/${taskId}` })));
  return comment;
}

export async function addChecklistItem(actor: ProjectActor, taskId: string, title: string) {
  const { tenantId, id: actorId } = actor;
  const task = await db.task.findFirst({ where: { id: taskId, tenantId } });
  if (!task) throw new Error('Work item not found');
  await requireProjectAccess(actor, task.projectId, 'contribute');
  const count = await db.taskChecklistItem.count({ where: { tenantId, taskId } });
  const item = await db.taskChecklistItem.create({ data: { tenantId, taskId, title, position: count } });
  await db.taskActivity.create({ data: { tenantId, taskId, actorId, action: 'CHECKLIST_ITEM_ADDED', metadata: { checklistItemId: item.id } } });
  return item;
}

export async function updateChecklistItem(actor: ProjectActor, taskId: string, itemId: string, isCompleted: boolean) {
  const { tenantId, id: actorId } = actor;
  const existing = await db.taskChecklistItem.findFirst({ where: { id: itemId, taskId, tenantId } });
  if (!existing) throw new Error('Checklist item not found');
  const task = await db.task.findFirst({ where: { id: taskId, tenantId }, select: { projectId: true } });
  if (!task) throw new Error('Work item not found');
  await requireProjectAccess(actor, task.projectId, 'contribute');
  const item = await db.taskChecklistItem.update({ where: { id: itemId }, data: { isCompleted, completedById: isCompleted ? actorId : null, completedAt: isCompleted ? new Date() : null } });
  await db.taskActivity.create({ data: { tenantId, taskId, actorId, action: isCompleted ? 'CHECKLIST_ITEM_COMPLETED' : 'CHECKLIST_ITEM_REOPENED', metadata: { checklistItemId: item.id } } });
  return item;
}

export async function createSprint(actor: ProjectActor, data: any) {
  const { tenantId, id: actorId } = actor;
  const project = await db.project.findFirst({ where: { id: data.projectId, tenantId, archivedAt: null } });
  if (!project) throw new Error('Project not found');
  await requireProjectAccess(actor, project.id, 'manage');
  const sprint = await db.projectSprint.create({ data: { tenantId, projectId: project.id, name: data.name, goal: data.goal ?? null, startDate: dateOrNull(data.startDate), endDate: dateOrNull(data.endDate) } });
  await event(tenantId, actorId, 'SPRINT', sprint.id, 'SPRINT_CREATED', { projectId: project.id });
  return sprint;
}
