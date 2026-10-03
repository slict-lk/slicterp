import { BaseIntegrationService, IntegrationHttpClient, IntegrationLogger } from './base';
import { INTEGRATION_CONFIGS } from './config';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

interface IkmanConfig {
  apiKey: string;
  apiSecret: string;
  location: string;
  category: string;
}

interface IkmanListing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  location: string;
  images: string[];
  condition: string;
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
}

export class IkmanService extends BaseIntegrationService {
  private client: IntegrationHttpClient;
  private config: IkmanConfig;

  constructor(tenantId: string, integrationAccount: any) {
    super(tenantId, integrationAccount);

    const settings = integrationAccount.settings as any;
    this.config = {
      apiKey: this.decryptToken(integrationAccount.apiKey || ''),
      apiSecret: this.decryptToken(integrationAccount.apiSecret || ''),
      location: settings?.location || 'colombo',
      category: settings?.category || 'all',
    };

    this.client = new IntegrationHttpClient(INTEGRATION_CONFIGS.IKMAN_LK.baseUrl, {
      'X-API-Key': this.config.apiKey,
      'X-API-Secret': this.config.apiSecret,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      // Simulate API connection test
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'connection_test',
        'Ikman.lk API connection successful (simulated)'
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

  async getListings(category?: string, location?: string): Promise<IkmanListing[]> {
    try {
      // If no API credentials are configured, return an empty list and log a warning.
      if (!this.config.apiKey || !this.config.apiSecret) {
        await IntegrationLogger.logError(
          this.tenantId,
          this.integrationAccount.id,
          'sync_listings',
          'No API credentials configured for Ikman integration',
          { category, location }
        );
        return [];
      }

      // TODO: Implement real Ikman.lk API call here using this.client
      // For now, return an empty result if credentials exist but no implementation is present.
      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'sync_listings',
        `No listings returned - Ikman integration not implemented`,
        { category, location },
        []
      );

      return [];
    } catch (error) {
      await IntegrationLogger.logError(
        this.tenantId,
        this.integrationAccount.id,
        'sync_listings',
        error instanceof Error ? error.message : 'Failed to fetch listings'
      );

      throw error;
    }
  }

  async createListing(listing: Partial<IkmanListing>): Promise<string> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const listingId = `ikman_${Date.now()}`;

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'create_listing',
        `Created listing: ${listingId}`,
        listing,
        { id: listingId }
      );

      return listingId;
    } catch (error) {
      await IntegrationLogger.logError(
        this.tenantId,
        this.integrationAccount.id,
        'create_listing',
        error instanceof Error ? error.message : 'Failed to create listing'
      );

      throw error;
    }
  }

  async syncFromERPProducts(products: any[]): Promise<any[]> {
    const syncedListings: any[] = [];

    for (const product of products) {
      try {
        const listingId = await this.createListing({
          title: product.name,
          description: product.description || `${product.name} - Available now`,
          price: Math.round(product.listPrice * 180), // Convert USD to LKR (approx 180:1)
          currency: 'LKR',
          category: product.category?.name || 'Other',
          location: this.config.location,
          condition: 'NEW',
          contact: {
            name: 'ERP Integration',
            phone: '+94 11 000 0000',
          },
          images: [], // Would need product images
        });

        syncedListings.push({
          productId: product.id,
          listingId,
          platform: 'IKMAN_LK',
          status: 'created',
        });
      } catch (error) {
        console.error(`Failed to sync product ${product.id} to Ikman:`, error);
        syncedListings.push({
          productId: product.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return syncedListings;
  }

  async syncData(): Promise<any> {
    try {
      const tenant = await getOrCreateDefaultTenant();

      // Get ERP products to sync
      const products = await (prisma as any).product.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
          canBeSold: true,
        },
        include: {
          category: true,
        },
      });

      const syncResults = await this.syncFromERPProducts(products);

      // Update last sync time
      await (prisma as any).integrationAccount.update({
        where: { id: this.integrationAccount.id },
        data: { lastSyncAt: new Date() },
      });

      return {
        productsSynced: products.length,
        listingsCreated: syncResults.filter(r => r.status === 'created').length,
        listingsFailed: syncResults.filter(r => r.status === 'failed').length,
        results: syncResults,
        note: 'Ikman synchronization completed (integration implementation required for real data)',
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
      platform: 'IKMAN_LK',
      connected: isConnected,
      accountName: this.integrationAccount.accountName,
      lastSync: this.integrationAccount.lastSyncAt,
      expiresAt: this.integrationAccount.expiresAt,
      config: {
        location: this.config.location,
        category: this.config.category,
        hasApiKey: !!this.config.apiKey,
        note: 'Simulated API for demonstration purposes',
      },
    };
  }

  // Simulate webhook verification
  verifyWebhook(signature: string, payload: string): boolean {
    // In real implementation, verify signature with API secret
    return true;
  }
}
