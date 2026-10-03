/**
 * POST /api/ai/groq/tasks/financial-report
 * Generate financial report from transaction data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { generateFinancialReport } from '@/lib/ai/erp-tasks';

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
    const { transactionData, period } = body;

    if (!transactionData || !period) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['transactionData', 'period'],
        },
        { status: 400 }
      );
    }

    const report = await generateFinancialReport(transactionData, period);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Error generating financial report:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
