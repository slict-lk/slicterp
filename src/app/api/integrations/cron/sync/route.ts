import { NextRequest, NextResponse } from 'next/server';
import { tryCatch } from '@/lib/error-handler';
import { isSessionOrCronAuthorized } from '@/lib/cron-auth';
import { handleIntegrationSyncStatus } from '@/lib/integrations/sync-management';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    const isAuthorized = await isSessionOrCronAuthorized(request);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');
    return handleIntegrationSyncStatus(integrationId);
  }, 'Failed to manage sync jobs');
}
