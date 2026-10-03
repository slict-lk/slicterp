import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runScheduledIntelligencePipelines } from '@/lib/intelligence/runtime/runtime-service';
import { isCronBearerAuthorized } from '@/lib/cron-bearer-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isCronBearerAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runScheduledIntelligencePipelines(prisma);
    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        results,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Scheduled intelligence run failed.',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
