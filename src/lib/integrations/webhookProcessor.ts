import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { IntegrationLogger } from '@/lib/integrations/base';

export async function processFacebookWebhook(tenantId: string, webhookData: any) {
  try {
    // Find Facebook integration
    const integration = await (prisma as any).integrationAccount.findFirst({
      where: {
        tenantId: tenantId,
        platform: 'FACEBOOK_MARKETPLACE',
        isActive: true,
      },
    });

    if (!integration) {
      console.log('No Facebook integration found');
      return;
    }

    // Process different Facebook webhook events
    if (webhookData.object === 'page') {
      for (const entry of webhookData.entry) {
        for (const event of entry.messaging || entry.standby || []) {
          await handleFacebookMessageEvent(tenantId, integration.id, event);
        }
      }
    }

    await IntegrationLogger.log(
      tenantId,
      integration.id,
      'webhook_facebook',
      'SUCCESS',
      `Facebook webhook processed: ${webhookData.object}`,
      webhookData
    );

  } catch (error) {
    console.error('Facebook webhook processing failed:', error);
    throw error;
  }
}

export async function processWhatsAppWebhook(tenantId: string, webhookData: any) {
  try {
    // Find WhatsApp integration
    const integration = await (prisma as any).integrationAccount.findFirst({
      where: {
        tenantId: tenantId,
        platform: 'WHATSAPP_BUSINESS',
        isActive: true,
      },
    });

    if (!integration) {
      console.log('No WhatsApp integration found');
      return;
    }

    // Process WhatsApp webhook events
    if (webhookData.object === 'whatsapp_business_account') {
      for (const entry of webhookData.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await handleWhatsAppMessageEvent(tenantId, integration.id, change.value);
          }
        }
      }
    }

    await IntegrationLogger.log(
      tenantId,
      integration.id,
      'webhook_whatsapp',
      'SUCCESS',
      `WhatsApp webhook processed: ${webhookData.object}`,
      webhookData
    );

  } catch (error) {
    console.error('WhatsApp webhook processing failed:', error);
    throw error;
  }
}

export async function processAramexWebhook(tenantId: string, webhookData: any) {
  try {
    // Find Aramex integration
    const integration = await (prisma as any).integrationAccount.findFirst({
      where: {
        tenantId: tenantId,
        platform: 'ARAMEX',
        isActive: true,
      },
    });

    if (!integration) {
      console.log('No Aramex integration found');
      return;
    }

    // Process Aramex shipment updates
    if (webhookData.trackingNumber) {
      await updateShipmentFromWebhook(tenantId, integration.id, webhookData, 'ARAMEX');
    }

    await IntegrationLogger.log(
      tenantId,
      integration.id,
      'webhook_aramex',
      'SUCCESS',
      `Aramex webhook processed: ${webhookData.trackingNumber}`,
      webhookData
    );

  } catch (error) {
    console.error('Aramex webhook processing failed:', error);
    throw error;
  }
}

export async function processDHLWebhook(tenantId: string, webhookData: any) {
  try {
    // Find DHL integration
    const integration = await (prisma as any).integrationAccount.findFirst({
      where: {
        tenantId: tenantId,
        platform: 'DHL',
        isActive: true,
      },
    });

    if (!integration) {
      console.log('No DHL integration found');
      return;
    }

    // Process DHL shipment updates
    if (webhookData.trackingNumber) {
      await updateShipmentFromWebhook(tenantId, integration.id, webhookData, 'DHL');
    }

    await IntegrationLogger.log(
      tenantId,
      integration.id,
      'webhook_dhl',
      'SUCCESS',
      `DHL webhook processed: ${webhookData.trackingNumber}`,
      webhookData
    );

  } catch (error) {
    console.error('DHL webhook processing failed:', error);
    throw error;
  }
}

export async function processDomexWebhook(tenantId: string, webhookData: any) {
  try {
    // Find Domex integration
    const integration = await (prisma as any).integrationAccount.findFirst({
      where: {
        tenantId: tenantId,
        platform: 'DOMEX',
        isActive: true,
      },
    });

    if (!integration) {
      console.log('No Domex integration found');
      return;
    }

    // Process Domex shipment updates
    if (webhookData.trackingNumber) {
      await updateShipmentFromWebhook(tenantId, integration.id, webhookData, 'DOMEX');
    }

    await IntegrationLogger.log(
      tenantId,
      integration.id,
      'webhook_domex',
      'SUCCESS',
      `Domex webhook processed: ${webhookData.trackingNumber}`,
      webhookData
    );

  } catch (error) {
    console.error('Domex webhook processing failed:', error);
    throw error;
  }
}

async function handleFacebookMessageEvent(tenantId: string, integrationAccountId: string, event: any) {
  try {
    // Find customer by Facebook user ID
    let customer = await (prisma as any).customer.findFirst({
      where: {
        tenantId: tenantId,
        // You might want to store Facebook user ID in customer metadata
      },
    });

    if (!customer) {
      // Create customer from Facebook contact
      customer = await (prisma as any).customer.create({
        data: {
          name: `Facebook User ${event.sender?.id || 'Unknown'}`,
          email: `fb_${event.sender?.id || 'unknown'}@facebook.com`,
          type: 'INDIVIDUAL',
          tenantId: tenantId,
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
        tenantId: tenantId,
      },
    });

  } catch (error) {
    console.error('Failed to handle Facebook message event:', error);
    throw error;
  }
}

async function handleWhatsAppMessageEvent(tenantId: string, integrationAccountId: string, messageData: any) {
  try {
    // Extract message details
    const message = messageData.messages?.[0];
    if (!message) return;

    // Find customer by WhatsApp ID
    let customer = await (prisma as any).customer.findFirst({
      where: {
        tenantId: tenantId,
        // Store WhatsApp ID in customer metadata or phone field
      },
    });

    if (!customer) {
      // Create customer from WhatsApp contact
      customer = await (prisma as any).customer.create({
        data: {
          name: messageData.contacts?.[0]?.profile?.name || `WhatsApp User ${message.from}`,
          email: `wa_${message.from}@whatsapp.com`,
          phone: message.from.replace(/^\+/, ''), // Remove + prefix
          type: 'INDIVIDUAL',
          tenantId: tenantId,
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
        tenantId: tenantId,
      },
    });

  } catch (error) {
    console.error('Failed to handle WhatsApp message event:', error);
    throw error;
  }
}

async function updateShipmentFromWebhook(tenantId: string, integrationAccountId: string, webhookData: any, platform: string) {
  try {
    // Find shipment by tracking number
    const shipment = await (prisma as any).shipment.findFirst({
      where: {
        trackingNumber: webhookData.trackingNumber,
        integrationAccount: {
          platform: platform,
        },
        tenantId: tenantId,
      },
    });

    if (!shipment) {
      console.log(`Shipment not found: ${webhookData.trackingNumber}`);
      return;
    }

    // Map webhook status to database status
    const statusMap: Record<string, string> = {
      'pending': 'PENDING',
      'picked_up': 'PICKED_UP',
      'in_transit': 'IN_TRANSIT',
      'out_for_delivery': 'OUT_FOR_DELIVERY',
      'delivered': 'DELIVERED',
      'failed': 'FAILED',
      'cancelled': 'CANCELLED',
      'returned': 'RETURNED',
    };

    const newStatus = statusMap[webhookData.status] || shipment.status;

    // Update shipment
    await (prisma as any).shipment.update({
      where: { id: shipment.id },
      data: {
        status: newStatus,
        estimatedDelivery: webhookData.estimatedDelivery ? new Date(webhookData.estimatedDelivery) : shipment.estimatedDelivery,
        actualDelivery: webhookData.actualDelivery ? new Date(webhookData.actualDelivery) : shipment.actualDelivery,
        lastUpdated: new Date(),
        metadata: {
          ...shipment.metadata,
          lastWebhookUpdate: new Date().toISOString(),
          webhookData: webhookData,
        },
      },
    });

    console.log(`✅ Updated shipment ${shipment.trackingNumber} to status: ${newStatus}`);

  } catch (error) {
    console.error('Failed to update shipment from webhook:', error);
    throw error;
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
