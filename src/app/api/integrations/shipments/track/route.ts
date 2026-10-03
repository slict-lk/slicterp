import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { formatSuccessResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();
    const { searchParams } = new URL(request.url);
    const trackingNumber = searchParams.get('trackingNumber');

    if (!trackingNumber) {
      return NextResponse.json(
        { error: 'Tracking number is required' },
        { status: 400 }
      );
    }

    // Find shipment
    const shipment = await (prisma as any).shipment.findFirst({
      where: {
        trackingNumber: { contains: trackingNumber, mode: 'insensitive' },
        tenantId: tenant.id,
      },
      include: {
        integrationAccount: true,
        salesOrder: {
          select: {
            id: true,
            orderNumber: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: 'Shipment not found' },
        { status: 404 }
      );
    }

    // Update tracking status using the courier service
    const { CourierService } = await import('@/lib/integrations/courierService');
    const service = new CourierService(tenant.id, shipment.integrationAccount);
    const trackingInfo = await service.trackShipment(shipment.trackingNumber);

    return NextResponse.json(formatSuccessResponse({
      shipment,
      tracking: trackingInfo,
    }));
  }, 'Failed to track shipment');
}

export async function PUT(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();

    // Sync all courier shipments
    const integrations = await (prisma as any).integrationAccount.findMany({
      where: {
        tenantId: tenant.id,
        platform: {
          in: ['ARAMEX', 'DHL', 'DOMEX'],
        },
        isActive: true,
      },
    });

    const syncResults: any[] = [];

    for (const integration of integrations) {
      try {
        const { CourierService } = await import('@/lib/integrations/courierService');
        const service = new CourierService(tenant.id, integration);
        const result = await service.syncData();

        syncResults.push({
          platform: integration.platform,
          accountName: integration.accountName,
          ...result,
        });
      } catch (error) {
        syncResults.push({
          platform: integration.platform,
          accountName: integration.accountName,
          error: error instanceof Error ? error.message : 'Sync failed',
        });
      }
    }

    return NextResponse.json(
      formatSuccessResponse({
        totalIntegrations: integrations.length,
        results: syncResults,
      }, 'Courier sync completed')
    );
  }, 'Failed to sync courier shipments');
}

