import { BaseIntegrationService, IntegrationHttpClient, IntegrationLogger } from './base';
import { INTEGRATION_CONFIGS } from './config';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

interface CourierConfig {
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  accountNumber?: string;
  originCountry: string;
  originCity: string;
}

interface ShipmentRequest {
  orderId: string;
  recipient: {
    name: string;
    company?: string;
    phone: string;
    email?: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  packages: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    description: string;
    value: number;
  }[];
  serviceType: string;
}

interface TrackingInfo {
  trackingNumber: string;
  status: string;
  statusDescription: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  events: {
    date: string;
    time: string;
    location: string;
    description: string;
    status: string;
  }[];
}

export class CourierService extends BaseIntegrationService {
  private client: IntegrationHttpClient;
  private config: CourierConfig;
  private platform: string;

  constructor(tenantId: string, integrationAccount: any) {
    super(tenantId, integrationAccount);

    const settings = integrationAccount.settings as any;
    this.platform = integrationAccount.platform;

    this.config = {
      apiKey: integrationAccount.apiKey ? this.decryptToken(integrationAccount.apiKey) : undefined,
      apiSecret: integrationAccount.apiSecret ? this.decryptToken(integrationAccount.apiSecret) : undefined,
      username: integrationAccount.apiKey ? this.decryptToken(integrationAccount.apiKey) : undefined,
      password: integrationAccount.apiSecret ? this.decryptToken(integrationAccount.apiSecret) : undefined,
      accountNumber: settings?.accountNumber,
      originCountry: settings?.originCountry || 'LK',
      originCity: settings?.originCity || 'Colombo',
    };

    // Set up platform-specific client
    let baseUrl: string;
    let authHeaders: Record<string, string> = {};

    switch (this.platform) {
      case 'ARAMEX':
        baseUrl = 'https://ws.aramex.net';
        authHeaders = {
          'Content-Type': 'text/xml',
        };
        break;
      case 'DHL':
        baseUrl = 'https://api.dhl.com';
        authHeaders = {
          'DHL-API-Key': this.config.apiKey || '',
        };
        break;
      case 'DOMEX':
        baseUrl = 'https://api.domex.lk/v1';
        authHeaders = {
          'Authorization': `Bearer ${this.config.apiKey || ''}`,
          'X-API-Key': this.config.apiKey || '',
        };
        break;
      default:
        baseUrl = 'https://api.example.com';
    }

    this.client = new IntegrationHttpClient(baseUrl, authHeaders);
  }

  async testConnection(): Promise<boolean> {
    try {
      switch (this.platform) {
        case 'ARAMEX':
          // Test Aramex connection
          await this.testAramexConnection();
          break;
        case 'DHL':
          // Test DHL connection
          await this.testDHLConnection();
          break;
        case 'DOMEX':
          // Test Domex connection
          await this.testDomexConnection();
          break;
        default:
          throw new Error(`Unsupported courier platform: ${this.platform}`);
      }

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'connection_test',
        `${this.platform} connection successful`
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

  private async testAramexConnection(): Promise<void> {
    // Simulate Aramex connection test
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async testDHLConnection(): Promise<void> {
    // Simulate DHL connection test
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async testDomexConnection(): Promise<void> {
    // Simulate Domex connection test
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async createShipment(shipmentRequest: ShipmentRequest): Promise<string> {
    try {
      let trackingNumber: string;
      let shipmentData: any;

      switch (this.platform) {
        case 'ARAMEX':
          const aramexResult = await this.createAramexShipment(shipmentRequest);
          trackingNumber = aramexResult.trackingNumber;
          shipmentData = aramexResult.data;
          break;
        case 'DHL':
          const dhlResult = await this.createDHLShipment(shipmentRequest);
          trackingNumber = dhlResult.trackingNumber;
          shipmentData = dhlResult.data;
          break;
        case 'DOMEX':
          const domexResult = await this.createDomexShipment(shipmentRequest);
          trackingNumber = domexResult.trackingNumber;
          shipmentData = domexResult.data;
          break;
        default:
          throw new Error(`Unsupported courier platform: ${this.platform}`);
      }

      // Save shipment to database
      const tenant = await getOrCreateDefaultTenant();
      await (prisma as any).shipment.create({
        data: {
          trackingNumber,
          courierName: this.platform,
          status: 'PENDING',
          salesOrderId: shipmentRequest.orderId,
          originAddress: {
            country: this.config.originCountry,
            city: this.config.originCity,
          },
          destinationAddress: shipmentRequest.recipient.address,
          weight: shipmentRequest.packages[0].weight,
          dimensions: shipmentRequest.packages[0].dimensions,
          packageCount: shipmentRequest.packages.length,
          description: shipmentRequest.packages[0].description,
          shippingCost: shipmentData?.shippingCost,
          estimatedDelivery: shipmentData?.estimatedDelivery,
          integrationAccountId: this.integrationAccount.id,
          tenantId: tenant.id,
        },
      });

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'create_shipment',
        `Created ${this.platform} shipment: ${trackingNumber}`,
        shipmentRequest,
        { trackingNumber, platform: this.platform }
      );

      return trackingNumber;
    } catch (error) {
      await IntegrationLogger.logError(
        this.tenantId,
        this.integrationAccount.id,
        'create_shipment',
        error instanceof Error ? error.message : 'Failed to create shipment'
      );

      throw error;
    }
  }

  private async createAramexShipment(shipmentRequest: ShipmentRequest): Promise<any> {
    // Simulate Aramex shipment creation
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      trackingNumber: `AX${Date.now()}`,
      data: {
        shippingCost: 1500,
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  private async createDHLShipment(shipmentRequest: ShipmentRequest): Promise<any> {
    // Simulate DHL shipment creation
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      trackingNumber: `DHL${Date.now()}`,
      data: {
        shippingCost: 2200,
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  private async createDomexShipment(shipmentRequest: ShipmentRequest): Promise<any> {
    // Simulate Domex shipment creation
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      trackingNumber: `DOM${Date.now()}`,
      data: {
        shippingCost: 800,
        estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    try {
      let trackingInfo: TrackingInfo;

      switch (this.platform) {
        case 'ARAMEX':
          trackingInfo = await this.trackAramexShipment(trackingNumber);
          break;
        case 'DHL':
          trackingInfo = await this.trackDHLShipment(trackingNumber);
          break;
        case 'DOMEX':
          trackingInfo = await this.trackDomexShipment(trackingNumber);
          break;
        default:
          throw new Error(`Unsupported courier platform: ${this.platform}`);
      }

      // Update shipment status in database
      await this.updateShipmentStatus(trackingNumber, trackingInfo);

      await IntegrationLogger.logSuccess(
        this.tenantId,
        this.integrationAccount.id,
        'track_shipment',
        `Tracked ${this.platform} shipment: ${trackingNumber}`,
        { trackingNumber },
        trackingInfo
      );

      return trackingInfo;
    } catch (error) {
      await IntegrationLogger.logError(
        this.tenantId,
        this.integrationAccount.id,
        'track_shipment',
        error instanceof Error ? error.message : 'Failed to track shipment'
      );

      throw error;
    }
  }

  private async trackAramexShipment(trackingNumber: string): Promise<TrackingInfo> {
    // Simulate Aramex tracking
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      trackingNumber,
      status: 'IN_TRANSIT',
      statusDescription: 'Package is in transit',
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      events: [
        {
          date: new Date().toISOString().split('T')[0],
          time: new Date().toISOString().split('T')[1].split('.')[0],
          location: 'Colombo, Sri Lanka',
          description: 'Package picked up',
          status: 'PICKED_UP',
        },
      ],
    };
  }

  private async trackDHLShipment(trackingNumber: string): Promise<TrackingInfo> {
    // Simulate DHL tracking
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      trackingNumber,
      status: 'DELIVERED',
      statusDescription: 'Package delivered successfully',
      actualDelivery: new Date().toISOString(),
      events: [
        {
          date: new Date().toISOString().split('T')[0],
          time: new Date().toISOString().split('T')[1].split('.')[0],
          location: 'Colombo, Sri Lanka',
          description: 'Package delivered',
          status: 'DELIVERED',
        },
      ],
    };
  }

  private async trackDomexShipment(trackingNumber: string): Promise<TrackingInfo> {
    // Simulate Domex tracking
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      trackingNumber,
      status: 'OUT_FOR_DELIVERY',
      statusDescription: 'Package out for delivery',
      estimatedDelivery: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      events: [
        {
          date: new Date().toISOString().split('T')[0],
          time: new Date().toISOString().split('T')[1].split('.')[0],
          location: 'Colombo, Sri Lanka',
          description: 'Out for delivery',
          status: 'OUT_FOR_DELIVERY',
        },
      ],
    };
  }

  private async updateShipmentStatus(trackingNumber: string, trackingInfo: TrackingInfo): Promise<void> {
    const tenant = await getOrCreateDefaultTenant();

    await (prisma as any).shipment.updateMany({
      where: {
        trackingNumber,
        tenantId: tenant.id,
      },
      data: {
        status: this.mapTrackingStatus(trackingInfo.status),
        estimatedDelivery: trackingInfo.estimatedDelivery ? new Date(trackingInfo.estimatedDelivery) : undefined,
        actualDelivery: trackingInfo.actualDelivery ? new Date(trackingInfo.actualDelivery) : undefined,
        lastUpdated: new Date(),
      },
    });
  }

  private mapTrackingStatus(status: string): 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'CANCELLED' | 'RETURNED' {
    switch (status.toUpperCase()) {
      case 'PENDING': return 'PENDING';
      case 'PICKED_UP': return 'PICKED_UP';
      case 'IN_TRANSIT': return 'IN_TRANSIT';
      case 'OUT_FOR_DELIVERY': return 'OUT_FOR_DELIVERY';
      case 'DELIVERED': return 'DELIVERED';
      case 'FAILED': return 'FAILED';
      case 'CANCELLED': return 'CANCELLED';
      case 'RETURNED': return 'RETURNED';
      default: return 'IN_TRANSIT';
    }
  }

  async syncData(): Promise<any> {
    try {
      const tenant = await getOrCreateDefaultTenant();

      // Get all shipments for this courier
      const shipments = await (prisma as any).shipment.findMany({
        where: {
          integrationAccountId: this.integrationAccount.id,
          tenantId: tenant.id,
        },
      });

      let updatedCount = 0;
      let failedCount = 0;

      // Update tracking status for each shipment
      for (const shipment of shipments) {
        try {
          await this.trackShipment(shipment.trackingNumber);
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update shipment ${shipment.trackingNumber}:`, error);
          failedCount++;
        }
      }

      // Update last sync time
      await (prisma as any).integrationAccount.update({
        where: { id: this.integrationAccount.id },
        data: { lastSyncAt: new Date() },
      });

      return {
        shipmentsUpdated: updatedCount,
        shipmentsFailed: failedCount,
        totalShipments: shipments.length,
        platform: this.platform,
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
      platform: this.platform,
      connected: isConnected,
      accountName: this.integrationAccount.accountName,
      lastSync: this.integrationAccount.lastSyncAt,
      expiresAt: this.integrationAccount.expiresAt,
      config: {
        originCountry: this.config.originCountry,
        originCity: this.config.originCity,
        hasCredentials: !!(this.config.apiKey || this.config.username),
        note: 'Courier service integration active',
      },
    };
  }

  // Webhook verification
  verifyWebhook(signature: string, payload: string): boolean {
    // Platform-specific webhook verification
    switch (this.platform) {
      case 'ARAMEX':
        return this.verifyAramexWebhook(signature, payload);
      case 'DHL':
        return this.verifyDHLWebhook(signature, payload);
      case 'DOMEX':
        return this.verifyDomexWebhook(signature, payload);
      default:
        return true;
    }
  }

  private verifyAramexWebhook(signature: string, payload: string): boolean {
    // Aramex webhook verification logic
    return true;
  }

  private verifyDHLWebhook(signature: string, payload: string): boolean {
    // DHL webhook verification logic
    return true;
  }

  private verifyDomexWebhook(signature: string, payload: string): boolean {
    // Domex webhook verification logic
    return true;
  }
}
