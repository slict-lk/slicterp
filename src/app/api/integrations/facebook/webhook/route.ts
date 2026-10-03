import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch } from '@/lib/error-handler';
import { IntegrationLogger } from '@/lib/integrations/base';


export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const tenant = await getOrCreateDefaultTenant();
    const signature = request.headers.get('x-hub-signature-256') || '';
    const payload = await request.text();

    // Find Facebook integration
    const integration = await (prisma as any).integrationAccount.findFirst({
      where: {
        tenantId: tenant.id,
        platform: 'FACEBOOK_MARKETPLACE',
        isActive: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Facebook integration not found' },
        { status: 404 }
      );
    }

    // Verify webhook signature
    const { FacebookMarketplaceService } = await import('@/lib/integrations/facebookService');

    const service = new FacebookMarketplaceService(tenant.id, integration);

    if (!service.verifyWebhook(signature, payload)) {
      await IntegrationLogger.log(
        tenant.id,
        integration.id,
        'webhook_verification',
        'ERROR',
        'Invalid webhook signature'
      );

      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Process webhook data
    const webhookData = JSON.parse(payload);

    await IntegrationLogger.log(
      tenant.id,
      integration.id,
      'webhook_received',
      'SUCCESS',
      `Facebook webhook received: ${webhookData.object}`,
      webhookData,
      undefined,
      undefined,
      0,
      1
    );

    // Handle different webhook events
    if (webhookData.object === 'page') {
      for (const entry of webhookData.entry) {
        for (const event of entry.messaging || entry.standby || []) {
          await handleMessageEvent(tenant.id, integration.id, event);
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  }, 'Failed to process Facebook webhook');
}

async function handleMessageEvent(tenantId: string, integrationAccountId: string, event: any) {
  try {
    const tenant = await getOrCreateDefaultTenant();

    // Find customer by sender ID or create if not exists
    let customer = await prisma.customer.findFirst({
      where: {
        tenantId: tenant.id,
        // You might want to store Facebook user ID in customer metadata
        // For now, we'll create a placeholder
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: `Facebook User ${event.sender?.id || 'Unknown'}`,
          email: `fb_${event.sender?.id || 'unknown'}@facebook.com`,
          type: 'INDIVIDUAL',
          tenantId: tenant.id,
        },
      });
    }

    // Save message
    await (prisma as any).message.create({
      data: {
        platform: 'FACEBOOK_MESSENGER',
        messageId: event.message?.mid || event.id,
        direction: 'INBOUND',
        senderId: event.sender?.id || 'unknown',
        recipientId: event.recipient?.id || 'unknown',
        messageType: event.message?.attachments ? 'IMAGE' : 'TEXT',
        content: event.message?.text || 'Media message',
        status: 'DELIVERED',
        integrationAccountId,
        customerId: customer.id,
        tenantId: tenant.id,
      },
    });

    await IntegrationLogger.log(
      tenantId,
      integrationAccountId,
      'message_received',
      'SUCCESS',
      `Message from ${event.sender?.id}`,
      event
    );

  } catch (error) {
    console.error('Failed to handle Facebook message event:', error);

    await IntegrationLogger.log(
      tenantId,
      integrationAccountId,
      'message_processing',
      'ERROR',
      error instanceof Error ? error.message : 'Failed to process message'
    );
  }
}

