import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { recordSafeOperationalEvent } from '@/lib/intelligence/events/safe-operational-events';


export const dynamic = 'force-dynamic';
// GET /api/hr/timesheets - Get all timesheets
export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const projectId = searchParams.get('projectId');
    const date = searchParams.get('date');

    const timesheets = await prisma.timesheet.findMany({
      where: {
        tenantId: tenant.id,
        ...(employeeId && { employeeId }),
        ...(projectId && { projectId }),
        ...(date && {
          date: new Date(date),
        }),
      },
      include: {
        employee: true,
        project: true,
        task: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(timesheets);
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    return NextResponse.json({ error: 'Failed to fetch timesheets' }, { status: 500 });
  }
}

// POST /api/hr/timesheets - Create new timesheet
export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    const timesheet = await prisma.timesheet.create({
      data: {
        employeeId: body.employeeId,
        projectId: body.projectId,
        taskId: body.taskId,
        date: new Date(body.date),
        hours: body.hours,
        description: body.description,
        tenantId: tenant.id,
      },
      include: {
        employee: true,
        project: true,
        task: true,
      },
    });

    await recordSafeOperationalEvent({
      tenantId: tenant.id,
      moduleKey: 'hr',
      entityType: 'TIMESHEET',
      entityId: timesheet.id,
      action: 'TIMESHEET_RECORDED',
      employeeId: timesheet.employeeId,
      durationMs: Math.round(Number(timesheet.hours || 0) * 60 * 60 * 1000),
      metadata: {
        projectId: timesheet.projectId,
        taskId: timesheet.taskId,
        date: timesheet.date.toISOString(),
        hours: timesheet.hours,
        billable: timesheet.billable,
      },
    });

    return NextResponse.json(timesheet, { status: 201 });
  } catch (error) {
    console.error('Error creating timesheet:', error);
    return NextResponse.json({ error: 'Failed to create timesheet' }, { status: 500 });
  }
}

