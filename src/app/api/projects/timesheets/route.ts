import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';
import { recordOperationalEvent } from '@/lib/intelligence/events/operational-event-service';
import { accessibleProjectWhere, requireProjectAccess, resolveProjectActor } from '@/apps/projects/access-policy';

const schema = z.object({
  employeeId: z.string().min(1), projectId: z.string().min(1), taskId: z.string().nullable().optional(),
  date: z.string(), hours: z.coerce.number().positive().max(24), description: z.string().max(2000).nullable().optional(),
  billable: z.boolean().default(true), hourlyRate: z.coerce.number().min(0).nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'projects', action: 'view' });
    const actor = await resolveProjectActor(user);
    const projectId = request.nextUrl.searchParams.get('projectId') || undefined;
    if (projectId) await requireProjectAccess(actor, projectId, 'view');
    const data = await prisma.timesheet.findMany({ where: { tenantId, ...(projectId ? { projectId } : { project: accessibleProjectWhere(actor) }) }, include: { employee: true, project: true, task: true }, orderBy: { date: 'desc' }, take: 500 });
    return NextResponse.json({ data, metadata: { count: data.length } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch timesheets' }, { status: error.message?.includes('Forbidden') ? 403 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'projects', action: 'create' });
    const actor = await resolveProjectActor(user);
    const input = schema.parse(await request.json());
    const [project, employee, task] = await Promise.all([
      prisma.project.findFirst({ where: { id: input.projectId, tenantId } }),
      prisma.employee.findFirst({ where: { id: input.employeeId, tenantId } }),
      input.taskId ? prisma.task.findFirst({ where: { id: input.taskId, tenantId, projectId: input.projectId } }) : null,
    ]);
    if (!project || !employee || (input.taskId && !task)) return NextResponse.json({ error: 'Invalid project, employee, or task' }, { status: 400 });
    await requireProjectAccess(actor, input.projectId, 'contribute');
    const rate = input.hourlyRate ?? project.defaultBillingRate ?? null;
    const costRate = project.defaultCostRate ?? null;
    const entry = await prisma.timesheet.create({ data: { tenantId, employeeId: input.employeeId, projectId: input.projectId, taskId: input.taskId, date: new Date(input.date), hours: input.hours, description: input.description, billable: input.billable, hourlyRate: rate, billableAmount: input.billable && rate != null ? input.hours * Number(rate) : null, costAmount: costRate != null ? input.hours * Number(costRate) : null, approvalStatus: 'DRAFT' } });
    await recordOperationalEvent(prisma, { tenantId, moduleKey: 'projects', entityType: 'TIMESHEET', entityId: entry.id, action: 'TIME_LOGGED', actorUserId: user.id, employeeId: input.employeeId, durationMs: Math.round(input.hours * 3600000), metadata: { projectId: input.projectId, taskId: input.taskId, billable: input.billable } });
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    return NextResponse.json({ error: error.message || 'Failed to create timesheet' }, { status: error.message?.includes('Forbidden') ? 403 : 500 });
  }
}
