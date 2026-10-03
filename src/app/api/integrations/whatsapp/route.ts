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
        platform: 'WHATSAPP_BUSINESS',
        isActive: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'WhatsApp Business integration not found' },
        { status: 404 }
      );
    }

    // Test connection and get status
    const { WhatsAppBusinessService } = await import('@/lib/integrations/whatsappService');

    const service = new WhatsAppBusinessService(tenant.id, integration);
    const status = await service.getStatus();

    return NextResponse.json(formatSuccessResponse(status));
  }, 'Failed to get WhatsApp status');
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
        platform: 'WHATSAPP_BUSINESS',
      },
    });

    if (integration) {
      // Update existing integration
      const { EncryptionService } = await import('@/lib/integrations/base');


      integration = await (prisma as any).integrationAccount.update({
        where: { id: integration.id },
        data: {
          accessToken: body.accessToken ? EncryptionService.encrypt(body.accessToken) : integration.accessToken,
          settings: {
            ...integration.settings,
            phoneNumberId: body.phoneNumberId,
            businessAccountId: body.businessAccountId,
          },
          lastSyncAt: new Date(),
        },
      });
    } else {
      // Create new integration
      const { EncryptionService } = await import('@/lib/integrations/base');


      integration = await (prisma as any).integrationAccount.create({
        data: {
          platform: 'WHATSAPP_BUSINESS',
          accountId: body.accountId || `wa_${Date.now()}`,
          accountName: body.accountName || 'WhatsApp Business',
          accessToken: body.accessToken ? EncryptionService.encrypt(body.accessToken) : null,
          settings: {
            phoneNumberId: body.phoneNumberId,
            businessAccountId: body.businessAccountId,
          },
          tenantId: tenant.id,
        },
      });
    }

    // Test connection
    const { WhatsAppBusinessService } = await import('@/lib/integrations/whatsappService');

    const service = new WhatsAppBusinessService(tenant.id, integration);
    const isConnected = await service.testConnection();

    return NextResponse.json(
      formatSuccessResponse({
        connected: isConnected,
        integration,
      }, 'WhatsApp Business integration updated successfully')
    );
  }, 'Failed to configure WhatsApp Business');
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
        platform: 'WHATSAPP_BUSINESS',
        isActive: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'WhatsApp Business integration not found' },
        { status: 404 }
      );
    }

    // Sync messages
    const { WhatsAppBusinessService } = await import('@/lib/integrations/whatsappService');

    const service = new WhatsAppBusinessService(tenant.id, integration);
    const syncResult = await service.syncData();

    return NextResponse.json(
      formatSuccessResponse(syncResult, 'WhatsApp sync completed')
    );
  }, 'Failed to sync WhatsApp messages');
}

