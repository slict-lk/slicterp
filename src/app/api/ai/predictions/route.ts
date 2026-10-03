import { NextResponse } from 'next/server';
import { getPredictiveInsights } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { tenantId } = await requireAIAccess('view');
    const predictions = await getPredictiveInsights(tenantId);
    return NextResponse.json(predictions);
  } catch (error: any) {
    const errStatus = error instanceof Response ? error.status : error?.status;
    if (errStatus === 401 || errStatus === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: errStatus });
    }
    console.error('Error fetching predictive insights:', error);
    return NextResponse.json({ error: 'Failed to fetch predictive insights' }, { status: 500 });
  }
}
