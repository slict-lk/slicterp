import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionMetrics } from '@/apps/subscriptions/api';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const tenantId = tenant.id;
    
    const metrics = await getSubscriptionMetrics(tenantId);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching subscription metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription metrics' },
      { status: 500 }
    );
  }
}
