import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
// GET /api/automation/rules - List automation rules
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const isActive = searchParams.get('isActive');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const rules = await prisma.automationRule.findMany({
      where: {
        tenantId,
        ...(isActive !== null && { isActive: isActive === 'true' }),
      },
      include: {
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(rules);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/automation/rules - Create automation rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, name, description, triggerType, triggerConfig, conditions, actions, isActive } = body;

    if (!tenantId || !name || !triggerType || !triggerConfig || !actions) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const rule = await prisma.automationRule.create({
      data: {
        tenantId,
        name,
        description,
        triggerType,
        triggerConfig,
        conditions: conditions || [],
        actions,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
