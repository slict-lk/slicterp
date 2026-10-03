import crypto from 'crypto';
import { BaseIntegrationService, IntegrationHttpClient, IntegrationLogger } from './base';
import { INTEGRATION_CONFIGS } from './config';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

interface FacebookMarketplaceConfig {
  pageId: string;
  accessToken: string;
}

interface FacebookListing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  location: {
    city: string;
    region: string;
  };
  images: string[];
  condition: string;
  availability: string;
}

export class FacebookMarketplaceService extends BaseIntegrationService {
  private client: IntegrationHttpClient;
  private config: FacebookMarketplaceConfig;

  constructor(tenantId: string, integrationAccount: any) {
    super(tenantId, integrationAccount);

    const settings = integrationAccount.settings as any;
    this.config = {
      pageId: settings?.pageId || '',
      accessToken: this.decryptToken(integrationAccount.accessToken || ''),
    };

    this.client = new IntegrationHttpClient(INTEGRATION_CONFIGS.FACEBOOK_MARKETPLACE.baseUrl, {
      'Authorization': `Bearer ${this.config.accessToken}`,
    });
  }

  async getStatus(): Promise<{ connected: boolean; lastSync?: Date; error?: string }> {
    try {
      const connected = await this.testConnection();
      return {
        connected,
        lastSync: this.integrationAccount?.lastSyncAt || undefined,
      };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message || 'Failed to get status',
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get(`/${this.config.pageId}`, {
        fields: 'id,name',
      });

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'connection_test',
        'Facebook Marketplace connection successful'
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

  async getListings(): Promise<FacebookListing[]> {
    try {
      const response = await this.client.get(`/${this.config.pageId}/marketplace_listings`, {
        fields: 'id,title,description,price,currency,category,location,images,condition,availability',
        limit: 100,
      });

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'sync_listings',
        `Retrieved ${response.data?.length || 0} listings`,
        undefined,
        response.data
      );

      return response.data || [];
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

  async createListing(listing: Partial<FacebookListing>): Promise<string> {
    try {
      const response = await this.client.post(`/${this.config.pageId}/marketplace_listings`, {
        title: listing.title,
        description: listing.description,
        price: listing.price,
        currency: listing.currency || 'USD',
        category: listing.category,
        location: listing.location,
        condition: listing.condition || 'NEW',
        availability: listing.availability || 'IN_STOCK',
        images: listing.images,
      });

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'create_listing',
        `Created listing: ${response.id}`,
        listing,
        response
      );

      return response.id;
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

  async updateListing(listingId: string, updates: Partial<FacebookListing>): Promise<void> {
    try {
      await this.client.post(`/${listingId}`, {
        ...updates,
      });

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'update_listing',
        `Updated listing: ${listingId}`,
        updates
      );
    } catch (error) {
      await IntegrationLogger.logError(
        this.tenantId,
        this.integrationAccount.id,
        'update_listing',
        error instanceof Error ? error.message : 'Failed to update listing'
      );

      throw error;
    }
  }

  async deleteListing(listingId: string): Promise<void> {
    try {
      await this.client.delete(`/${listingId}`);

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'delete_listing',
        `Deleted listing: ${listingId}`
      );
    } catch (error) {
      await IntegrationLogger.logError(
        this.tenantId,
        this.integrationAccount.id,
        'delete_listing',
        error instanceof Error ? error.message : 'Failed to delete listing'
      );

      throw error;
    }
  }

  async syncFromERPProducts(products: any[]): Promise<any[]> {
    const syncedListings: any[] = [];

    for (const product of products) {
      try {
        // Check if listing already exists
        const existingListings = await this.getListings();
        const existingListing = existingListings.find(l => l.title === product.name);

        if (existingListing) {
          // Update existing listing
          await this.updateListing(existingListing.id, {
            title: product.name,
            description: product.description,
            price: product.listPrice,
            currency: 'USD',
            category: product.category?.name || 'Other',
            availability: product.qtyAvailable > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
          });

          syncedListings.push({
            productId: product.id,
            listingId: existingListing.id,
            status: 'updated',
          });
        } else {
          // Create new listing
          const listingId = await this.createListing({
            title: product.name,
            description: product.description,
            price: product.listPrice,
            currency: 'USD',
            category: product.category?.name || 'Other',
            condition: 'NEW',
            availability: product.qtyAvailable > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
            location: {
              city: 'Default City',
              region: 'Default Region',
            },
            images: [], // Would need to upload product images
          });

          syncedListings.push({
            productId: product.id,
            listingId,
            status: 'created',
          });
        }
      } catch (error) {
        console.error(`Failed to sync product ${product.id}:`, error);
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
        listingsUpdated: syncResults.filter(r => r.status === 'updated').length,
        listingsFailed: syncResults.filter(r => r.status === 'failed').length,
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

  // Webhook verification for Facebook
  verifyWebhook(signature: string, payload: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.decryptToken(this.integrationAccount.webhookSecret || ''))
      .update(payload)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }
}
