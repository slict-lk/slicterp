import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { recordSafeOperationalEvent } from '@/lib/intelligence/events/safe-operational-events';


export const dynamic = 'force-dynamic';
// GET /api/hr/departments - Get all departments
export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();

    const departments = await prisma.department.findMany({
      where: {
        tenantId: tenant.id,
      },
      include: {
        employees: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

// POST /api/hr/departments - Create new department
export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    const department = await prisma.department.create({
      data: {
        name: body.name,
        code: body.code,
        description: body.description,
        managerId: body.managerId,
        tenantId: tenant.id,
      },
      include: {
        employees: true,
      },
    });

    await recordSafeOperationalEvent({
      tenantId: tenant.id,
      moduleKey: 'hr',
      entityType: 'DEPARTMENT',
      entityId: department.id,
      action: 'DEPARTMENT_CREATED',
      metadata: {
        name: department.name,
        code: department.code,
        managerId: department.managerId,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}

