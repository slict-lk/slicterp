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
    const integration = await (prisma as any).integrationAccount.findFirst({
      where: {
        tenantId: tenant.id,
        platform: 'FACEBOOK_MARKETPLACE',
        isActive: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Facebook Marketplace integration not found' },
        { status: 404 }
      );
    }

    // Test connection and get status
    const { FacebookMarketplaceService } = await import('@/lib/integrations/facebookService');

    const service = new FacebookMarketplaceService(tenant.id, integration);
    const status = await service.getStatus();

    return NextResponse.json(formatSuccessResponse(status));
  }, 'Failed to get Facebook Marketplace status');
}

export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    // Find or create integration account
    let integration = await (prisma as any).integrationAccount.findFirst({
      where: {
        tenantId: tenant.id,
        platform: 'FACEBOOK_MARKETPLACE',
      },
    });

    if (integration) {
      // Update existing integration
      integration = await (prisma as any).integrationAccount.update({
        where: { id: integration.id },
        data: {
          accessToken: body.accessToken ? require('@/lib/integrations/base').EncryptionService.encrypt(body.accessToken) : integration.accessToken,
          settings: {
            ...integration.settings,
            ...body.settings,
          },
          lastSyncAt: new Date(),
        },
      });
    } else {
      // Create new integration
      const { EncryptionService } = await import('@/lib/integrations/base');


      integration = await (prisma as any).integrationAccount.create({
        data: {
          platform: 'FACEBOOK_MARKETPLACE',
          accountId: body.accountId || `fb_${Date.now()}`,
          accountName: body.accountName || 'Facebook Marketplace',
          accessToken: body.accessToken ? EncryptionService.encrypt(body.accessToken) : null,
          settings: body.settings || {},
          tenantId: tenant.id,
        },
      });
    }

    // Test connection
    const { FacebookMarketplaceService } = await import('@/lib/integrations/facebookService');

    const service = new FacebookMarketplaceService(tenant.id, integration);
    const isConnected = await service.testConnection();

    return NextResponse.json(
      formatSuccessResponse({
        connected: isConnected,
        integration,
      }, 'Facebook Marketplace integration updated successfully')
    );
  }, 'Failed to configure Facebook Marketplace');
}

export async function PUT(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    const integration = await (prisma as any).integrationAccount.findFirst({
      where: {
        tenantId: tenant.id,
        platform: 'FACEBOOK_MARKETPLACE',
        isActive: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Facebook Marketplace integration not found' },
        { status: 404 }
      );
    }

    // Sync data
    const { FacebookMarketplaceService } = await import('@/lib/integrations/facebookService');

    const service = new FacebookMarketplaceService(tenant.id, integration);
    const syncResult = await service.syncData();

    return NextResponse.json(
      formatSuccessResponse(syncResult, 'Facebook Marketplace sync completed')
    );
  }, 'Failed to sync Facebook Marketplace');
}

