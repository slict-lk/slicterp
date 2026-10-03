import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { formatSuccessResponse, formatPaginatedResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';
import { recordOperationalEvent } from '@/lib/intelligence/events/operational-event-service';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    const tenant = await getOrCreateDefaultTenant();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: tenant.id,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (date) {
      where.date = {
        gte: new Date(date),
        lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
      };
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.attendance.count({ where }),
    ]);

    return NextResponse.json(
      formatPaginatedResponse(attendance, page, limit, total)
    );
  }, 'Failed to fetch attendance');
}

export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const tenant = await getOrCreateDefaultTenant();
    const { requirePermission } = await import('@/lib/auth');
    const user = await requirePermission('hr', 'create');
    const body = await request.json();

    // Validate required fields
    if (!body.employeeId || !body.date || !body.status) {
      return NextResponse.json(
        { error: 'Employee ID, date, and status are required' },
        { status: 400 }
      );
    }

    // Check if attendance already exists for this employee on this date
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: body.employeeId,
        date: new Date(body.date),
        tenantId: tenant.id,
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Attendance already recorded for this employee on this date' },
        { status: 409 }
      );
    }

    const attendanceData = {
      employeeId: body.employeeId,
      date: new Date(body.date),
      checkIn: new Date(body.checkIn),
      checkOut: body.checkOut ? new Date(body.checkOut) : null,
      status: body.status,
      notes: body.notes,
      tenantId: tenant.id
    };

    const attendance = await prisma.attendance.create({
      data: attendanceData,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const durationMs = attendance.checkIn && attendance.checkOut
      ? attendance.checkOut.getTime() - attendance.checkIn.getTime()
      : null;

    await recordOperationalEvent(prisma, {
      tenantId: tenant.id,
      moduleKey: 'hr',
      entityType: 'ATTENDANCE',
      entityId: attendance.id,
      action: 'ATTENDANCE_RECORDED',
      actorUserId: user.id,
      employeeId: attendance.employeeId,
      occurredAt: attendance.createdAt,
      durationMs,
      metadata: {
        attendanceDate: attendance.date.toISOString(),
        status: attendance.status,
      },
    });

    return NextResponse.json(
      formatSuccessResponse(attendance, 'Attendance recorded successfully'),
      { status: 201 }
    );
  }, 'Failed to record attendance');
}

