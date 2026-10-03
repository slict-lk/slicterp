import crypto from 'crypto';
import { BaseIntegrationService, IntegrationHttpClient, IntegrationLogger } from './base';
import { INTEGRATION_CONFIGS } from './config';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
}

interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'video' | 'audio';
  text?: {
    body: string;
  };
  image?: {
    caption?: string;
    mime_type: string;
    sha256: string;
    id: string;
  };
}

export class WhatsAppBusinessService extends BaseIntegrationService {
  private client: IntegrationHttpClient;
  private config: WhatsAppConfig;

  constructor(tenantId: string, integrationAccount: any) {
    super(tenantId, integrationAccount);

    const settings = integrationAccount.settings as any;
    this.config = {
      phoneNumberId: settings?.phoneNumberId || '',
      accessToken: this.decryptToken(integrationAccount.accessToken || ''),
      businessAccountId: settings?.businessAccountId || '',
    };

    this.client = new IntegrationHttpClient(INTEGRATION_CONFIGS.WHATSAPP_BUSINESS.baseUrl, {
      'Authorization': `Bearer ${this.config.accessToken}`,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get(`/${this.config.phoneNumberId}`, {
        fields: 'id,display_phone_number',
      });

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'connection_test',
        'WhatsApp Business API connection successful'
      );

      return true;
    } catch (error) {
      await IntegrationLogger.logError(
        this.tenantId,
        this.integrationAccount.id,
        'connection_test',
        error instanceof Error ? error.message : 'Connection failed'
      );

      return false;
    }
  }

  async getMessages(since?: string): Promise<WhatsAppMessage[]> {
    try {
      const params: any = {
        fields: 'id,from,to,timestamp,type,text,image,document,video,audio',
        limit: 100,
      };

      if (since) {
        params.since = since;
      }

      const response = await this.client.get(`/${this.config.phoneNumberId}/messages`, params);

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'sync_messages',
        `Retrieved ${response.data?.length || 0} messages`,
        undefined,
        response.data
      );

      return response.data || [];
    } catch (error) {
      await IntegrationLogger.logError(
        this.tenantId,
        this.integrationAccount.id,
        'sync_messages',
        error instanceof Error ? error.message : 'Failed to fetch messages'
      );

      throw error;
    }
  }

  async sendMessage(to: string, message: string, messageType: 'text' | 'template' = 'text'): Promise<string> {
    try {
      let payload: any;

      if (messageType === 'text') {
        payload = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body: message,
          },
        };
      } else {
        // Template message
        payload = {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: message, // Template name
            language: {
              code: 'en',
            },
          },
        };
      }

      const response = await this.client.post(`/${this.config.phoneNumberId}/messages`, payload);

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'send_message',
        `Sent message to ${to}`,
        payload,
        response
      );

      return response.messages?.[0]?.id || '';
    } catch (error) {
      await IntegrationLogger.logError(
        this.tenantId,
        this.integrationAccount.id,
        'send_message',
        error instanceof Error ? error.message : 'Failed to send message'
      );

      throw error;
    }
  }

  async syncMessagesToERP(): Promise<any[]> {
    try {
      const tenant = await getOrCreateDefaultTenant();

      // Get recent messages
      const messages = await this.getMessages();

      const syncedMessages: any[] = [];

      for (const msg of messages) {
        // Find customer by phone number
        const customer = await (prisma as any).customer.findFirst({
          where: {
            tenantId: tenant.id,
            phone: msg.from.replace(/^\+/, ''), // Remove + prefix
          },
        });

        // Create or update message record
        const messageRecord = await (prisma as any).message.upsert({
          where: {
            platform_messageId: {
              platform: 'WHATSAPP',
              messageId: msg.id,
            },
          },
          create: {
            platform: 'WHATSAPP',
            messageId: msg.id,
            direction: 'INBOUND',
            senderId: msg.from,
            recipientId: this.config.phoneNumberId,
            messageType: this.mapWhatsAppMessageType(msg.type),
            content: this.extractMessageContent(msg),
            status: 'DELIVERED',
            integrationAccountId: this.integrationAccount.id,
            customerId: customer?.id,
            tenantId: tenant.id,
          },
          update: {
            status: 'DELIVERED',
            updatedAt: new Date(),
          },
        });

        syncedMessages.push({
          messageId: msg.id,
          customerId: customer?.id,
          customerName: customer?.name,
          status: 'synced',
        });
      }

      // Update last sync time
      await (prisma as any).integrationAccount.update({
        where: { id: this.integrationAccount.id },
        data: { lastSyncAt: new Date() },
      });

      return syncedMessages;
    } catch (error) {
      await IntegrationLogger.logError(
        this.tenantId,
        this.integrationAccount.id,
        'sync_messages',
        error instanceof Error ? error.message : 'Failed to sync messages'
      );

      throw error;
    }
  }

  private mapWhatsAppMessageType(type: string): 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO' {
    switch (type) {
      case 'text': return 'TEXT';
      case 'image': return 'IMAGE';
      case 'document': return 'DOCUMENT';
      case 'video': return 'VIDEO';
      case 'audio': return 'AUDIO';
      default: return 'TEXT';
    }
  }

  private extractMessageContent(msg: WhatsAppMessage): string {
    switch (msg.type) {
      case 'text':
        return msg.text?.body || '';
      case 'image':
        return msg.image?.caption || 'Image received';
      case 'document':
        return `Document: ${(msg as any).document?.filename || 'document'}`;
      case 'video':
        return 'Video received';
      case 'audio':
        return 'Audio received';
      default:
        return 'Message received';
    }
  }

  async createTemplate(name: string, content: string): Promise<string> {
    try {
      const response = await this.client.post(`/${this.config.businessAccountId}/message_templates`, {
        name,
        language: 'en',
        category: 'MARKETING',
        components: [
          {
            type: 'BODY',
            text: content,
          },
        ],
      });

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'create_template',
        `Created template: ${name}`,
        { name, content },
        response
      );

      return response.id;
    } catch (error) {
      await IntegrationLogger.logError(
        this.tenantId,
        this.integrationAccount.id,
        'create_template',
        error instanceof Error ? error.message : 'Failed to create template'
      );

      throw error;
    }
  }

  async syncData(): Promise<any> {
    try {
      const syncResults = await this.syncMessagesToERP();

      return {
        messagesSynced: syncResults.length,
        newMessages: syncResults.filter(r => r.status === 'synced').length,
        results: syncResults,
      };
    } catch (error) {
      await IntegrationLogger.logError(
        this.tenantId,
        this.integrationAccount.id,
        'sync_data',
        error instanceof Error ? error.message : 'Sync failed'
      );

      throw error;
    }
  }

  async getStatus(): Promise<any> {
    const isConnected = await this.testConnection();

    return {
      platform: 'WHATSAPP_BUSINESS',
      connected: isConnected,
      accountName: this.integrationAccount.accountName,
      lastSync: this.integrationAccount.lastSyncAt,
      expiresAt: this.integrationAccount.expiresAt,
      config: {
        phoneNumberId: this.config.phoneNumberId,
        businessAccountId: this.config.businessAccountId,
        hasAccessToken: !!this.config.accessToken,
      },
    };
  }

  // Webhook verification for WhatsApp
  verifyWebhook(signature: string, payload: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.decryptToken(this.integrationAccount.webhookSecret || ''))
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }
}
