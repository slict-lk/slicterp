// Projects & Tasks API Functions
import { prisma } from '@/lib/prisma';
import type { Project, Task, Timesheet } from './types';

export async function getProjects(tenantId: string) {
  return await prisma.project.findMany({
    where: { tenantId },
    include: {
      tasks: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createProject(data: Partial<Project> & { tenantId: string }) {
  return await prisma.project.create({
    data: {
      code: (data as any).code || `PRJ-${Date.now()}`,
      name: data.name!,
      description: data.description,
      status: (data.status as any) || 'PLANNING',
      startDate: data.startDate,
      endDate: data.endDate,
      budget: data.budget,
      tenantId: data.tenantId,
    },
  });
}

export async function getTasks(tenantId: string, projectId?: string) {
  return await prisma.task.findMany({
    where: {
      tenantId,
      ...(projectId && { projectId }),
    },
    include: {
      project: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createTask(data: Partial<Task> & { tenantId: string }) {
  return await prisma.task.create({
    data: {
      title: data.title!,
      description: data.description,
      status: (data.status as any) || 'TODO',
      priority: (data.priority as any) || 'MEDIUM',
      projectId: data.projectId!,
      assigneeId: data.assigneeId,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
      tenantId: data.tenantId,
    },
  });
}

export async function getTimesheets(tenantId: string, employeeId?: string) {
  return await prisma.timesheet.findMany({
    where: {
      tenantId,
      ...(employeeId && { employeeId }),
    },
    include: {
      employee: true,
      project: true,
      task: true,
    },
    orderBy: { date: 'desc' },
  });
}
