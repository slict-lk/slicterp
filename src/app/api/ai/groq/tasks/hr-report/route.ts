/**
 * POST /api/ai/groq/tasks/hr-report
 * Generate HR report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { generateHRReport } from '@/lib/ai/erp-tasks';

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
    const { employeeData, period } = body;

    if (!employeeData || !period) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['employeeData', 'period'],
        },
        { status: 400 }
      );
    }

    const report = await generateHRReport(employeeData, period);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Error generating HR report:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
