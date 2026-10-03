import { NextRequest, NextResponse } from 'next/server';
import { getForecastSnapshot } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireAIAccess('view');
    const { searchParams } = new URL(request.url);
    const rawMonths = parseInt(searchParams.get('months') || '6', 10);
    const months = Number.isNaN(rawMonths) ? 6 : Math.min(Math.max(rawMonths, 1), 24);
    
    const forecast = await getForecastSnapshot(tenantId, months);
    return NextResponse.json(forecast);
  } catch (error) {
    console.error('Error generating forecast:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}
