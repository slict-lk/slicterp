import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { formatSuccessResponse, formatPaginatedResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';
import { recordSafeOperationalEvent } from '@/lib/intelligence/events/safe-operational-events';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    const tenant = await getOrCreateDefaultTenant();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const leaveType = searchParams.get('leaveType');

    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: tenant.id,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (leaveType && leaveType !== 'ALL') {
      where.leaveType = leaveType;
    }

    const [leaveRequests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          employee: {
            include: {
              department: true
            }
          }
        }
      }),
      prisma.leaveRequest.count({ where })
    ]);

    return NextResponse.json(
      formatPaginatedResponse(leaveRequests, page, limit, total)
    );
  }, 'Failed to fetch leave requests');
}

export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    // Validate required fields
    if (!body.employeeId || !body.leaveType || !body.startDate || !body.endDate || !body.reason) {
      return NextResponse.json(
        { error: 'Employee ID, leave type, start date, end date, and reason are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: body.employeeId,
        leaveType: body.leaveType,
        startDate,
        endDate,
        days: body.days || 1,
        reason: body.reason,
        status: body.status || 'PENDING',
        tenantId: tenant.id,
      },
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

    await recordSafeOperationalEvent({
      tenantId: tenant.id,
      moduleKey: 'hr',
      entityType: 'LEAVE_REQUEST',
      entityId: leaveRequest.id,
      action: 'LEAVE_REQUEST_CREATED',
      employeeId: leaveRequest.employeeId,
      metadata: {
        leaveType: leaveRequest.leaveType,
        status: leaveRequest.status,
        days: leaveRequest.days,
        startDate: leaveRequest.startDate.toISOString(),
        endDate: leaveRequest.endDate.toISOString(),
      },
    });

    return NextResponse.json(
      formatSuccessResponse(leaveRequest, 'Leave request submitted successfully'),
      { status: 201 }
    );
  }, 'Failed to submit leave request');
}

