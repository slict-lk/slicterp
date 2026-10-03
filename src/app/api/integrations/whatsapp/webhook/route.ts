import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch } from '@/lib/error-handler';
import { IntegrationLogger } from '@/lib/integrations/base';


export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const tenant = await getOrCreateDefaultTenant();
    const payload = await request.json();

    // Verify webhook (Meta sends a verify token)
    const verifyToken = request.headers.get('x-whatsapp-verify-token');
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (verifyToken !== expectedToken) {
      return NextResponse.json(
        { error: 'Invalid verify token' },
        { status: 401 }
      );
    }

    // Find WhatsApp integration
    const integration = await (prisma as any).integrationAccount.findFirst({
      where: {
        tenantId: tenant.id,
        platform: 'WHATSAPP_BUSINESS',
        isActive: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'WhatsApp integration not found' },
        { status: 404 }
      );
    }

    await IntegrationLogger.log(
      tenant.id,
      integration.id,
      'webhook_received',
      'SUCCESS',
      `WhatsApp webhook received: ${payload.object}`,
      payload,
      undefined,
      undefined,
      0,
      1
    );

    // Handle webhook events
    if (payload.object === 'whatsapp_business_account') {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await handleWhatsAppMessage(tenant.id, integration.id, change.value);
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  }, 'Failed to process WhatsApp webhook');
}

async function handleWhatsAppMessage(tenantId: string, integrationAccountId: string, messageData: any) {
  try {
    const tenant = await getOrCreateDefaultTenant();

    // Extract message details
    const message = messageData.messages?.[0];
    if (!message) return;

    // Find customer by WhatsApp ID
    let customer = await prisma.customer.findFirst({
      where: {
        tenantId: tenant.id,
        // Store WhatsApp ID in customer metadata or phone field
      },
    });

    if (!customer) {
      // Create customer from WhatsApp contact
      customer = await prisma.customer.create({
        data: {
          name: messageData.contacts?.[0]?.profile?.name || `WhatsApp User ${message.from}`,
          email: `wa_${message.from}@whatsapp.com`,
          phone: message.from.replace(/^\+/, ''), // Remove + prefix
          type: 'INDIVIDUAL',
          tenantId: tenant.id,
        },
      });
    }

    // Save message
    await (prisma as any).message.create({
      data: {
        platform: 'WHATSAPP',
        messageId: message.id,
        direction: 'INBOUND',
        senderId: message.from,
        recipientId: messageData.metadata?.phone_number_id || 'unknown',
        messageType: mapWhatsAppMessageType(message.type),
        content: extractWhatsAppMessageContent(message),
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
      `WhatsApp message from ${message.from}`,
      message
    );

  } catch (error) {
    console.error('Failed to handle WhatsApp message:', error);

    await IntegrationLogger.log(
      tenantId,
      integrationAccountId,
      'message_processing',
      'ERROR',
      error instanceof Error ? error.message : 'Failed to process message'
    );
  }
}

function mapWhatsAppMessageType(type: string): 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO' {
  switch (type) {
    case 'text': return 'TEXT';
    case 'image': return 'IMAGE';
    case 'document': return 'DOCUMENT';
    case 'video': return 'VIDEO';
    case 'audio': return 'AUDIO';
    default: return 'TEXT';
  }
}

function extractWhatsAppMessageContent(message: any): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    case 'image':
      return message.image?.caption || 'Image received';
    case 'document':
      return `Document: ${message.document?.filename || 'document'}`;
    case 'video':
      return 'Video received';
    case 'audio':
      return 'Audio received';
    default:
      return 'Message received';
  }
}

