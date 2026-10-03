import { NextRequest, NextResponse } from 'next/server';
import { getCommandCenterData } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireAIAccess('view');
    const { searchParams } = new URL(request.url);
    const excludeLow = searchParams.get('unread') === 'true';
    
    const data = await getCommandCenterData(tenantId);
    const insights = excludeLow
      ? data.alerts.filter((alert) => alert.severity !== 'LOW')
      : data.alerts;
    return NextResponse.json(insights);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      const status = error?.status || 403;
      return NextResponse.json({ error: 'Unauthorized' }, { status });
    }
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
