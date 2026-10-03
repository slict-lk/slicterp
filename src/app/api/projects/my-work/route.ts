import { NextResponse } from 'next/server';
import { getMyWork } from '@/apps/projects/service';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';

export async function GET() {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'projects', action: 'view' });
    const identity = await prisma.user.findFirst({
      where: { id: user.id, tenantId },
      select: { employeeId: true },
    });
    const data = await getMyWork(tenantId, user.id, identity?.employeeId ?? null);
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch personal work' },
      { status: error.message?.includes('Forbidden') ? 403 : 500 }
    );
  }
}
