/**
 * POST /api/ai/groq/tasks/sales-prediction
 * Predict sales based on historical data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { predictSales } from '@/lib/ai/erp-tasks';

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
    const { historicalData, marketContext } = body;

    if (!historicalData || !marketContext) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['historicalData', 'marketContext'],
        },
        { status: 400 }
      );
    }

    const prediction = await predictSales(historicalData, marketContext);

    return NextResponse.json({
      success: true,
      prediction,
    });
  } catch (error: any) {
    console.error('Error predicting sales:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
