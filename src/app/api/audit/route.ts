import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { searchAuditLogs, getAuditStats } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/audit - Get audit logs with optional filters
export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { searchParams } = new URL(request.url);
    
    const action = searchParams.get('action') as any;
    const resource = searchParams.get('resource') as any;
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined;
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const stats = searchParams.get('stats') === 'true';

    if (stats) {
      const auditStats = await getAuditStats(tenant.id);
      return NextResponse.json(auditStats);
    }

    const logs = await searchAuditLogs({
      tenantId: tenant.id,
      action,
      resource,
      userId,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
