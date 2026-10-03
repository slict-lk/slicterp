import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';

export const dynamic = 'force-dynamic';
// GET /api/tenant/current - Get current tenant
export async function GET(_request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error: any) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant', details: error.message },
      { status: 500 }
    );
  }
}

