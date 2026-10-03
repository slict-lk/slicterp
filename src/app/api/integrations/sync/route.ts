import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { formatSuccessResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { jobQueue } from '@/lib/jobs/queue';
import { handleIntegrationSyncStatus } from '@/lib/integrations/sync-management';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');
    return handleIntegrationSyncStatus(integrationId);
  }, 'Failed to manage sync jobs');
}

export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (body.action === 'start_queue') {
      jobQueue.start();
      return NextResponse.json(
        formatSuccessResponse({}, 'Job queue started successfully')
      );
    }

    if (body.action === 'stop_queue') {
      jobQueue.stop();
      return NextResponse.json(
        formatSuccessResponse({}, 'Job queue stopped successfully')
      );
    }

    if (body.action === 'sync_all') {
      // Trigger sync for all active integrations
      const tenant = await getOrCreateDefaultTenant();
      const integrations = await (prisma as any).integrationAccount.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
        },
      });

      const results: any[] = [];

      for (const integration of integrations) {
        const success = await jobQueue.triggerSync(integration.id);
        results.push({
          integrationId: integration.id,
          platform: integration.platform,
          accountName: integration.accountName,
          success,
        });
      }

      return NextResponse.json(
        formatSuccessResponse({
          totalIntegrations: integrations.length,
          results,
        }, 'All integrations sync triggered')
      );
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  }, 'Failed to manage sync jobs');
}

