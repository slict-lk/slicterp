import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { formatSuccessResponse } from '@/lib/error-handler';
import { jobQueue } from '@/lib/jobs/queue';

export async function handleIntegrationSyncStatus(integrationId: string | null) {
  const tenant = await getOrCreateDefaultTenant();

  if (integrationId) {
    const success = await jobQueue.triggerSync(integrationId);

    if (success) {
      return NextResponse.json(
        formatSuccessResponse({}, 'Integration sync triggered successfully')
      );
    }

    return NextResponse.json({ error: 'Failed to trigger sync' }, { status: 400 });
  }

  const status = jobQueue.getStatus();
  const logs = await prisma.integrationLog.findMany({
    where: {
      tenantId: tenant.id,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json(
    formatSuccessResponse({
      queue: status,
      recentLogs: logs,
    })
  );
}
