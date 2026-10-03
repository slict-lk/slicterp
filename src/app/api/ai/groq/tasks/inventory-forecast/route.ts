/**
 * POST /api/ai/groq/tasks/inventory-forecast
 * Forecast inventory needs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { forecastInventory } from '@/lib/ai/erp-tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productData, demandTrends } = body;

    if (!productData || !demandTrends) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['productData', 'demandTrends'],
        },
        { status: 400 }
      );
    }

    const forecasts = await forecastInventory(productData, demandTrends);

    return NextResponse.json({
      success: true,
      forecasts,
    });
  } catch (error: any) {
    console.error('Error forecasting inventory:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
