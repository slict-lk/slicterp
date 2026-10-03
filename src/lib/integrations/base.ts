import crypto from 'crypto';

// Encryption utilities for sensitive data
export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;

  static encrypt(text: string, key?: string): string {
    const encryptionKey = key || process.env.ENCRYPTION_KEY;

    if (!encryptionKey || encryptionKey.length !== this.KEY_LENGTH) {
      throw new Error('Invalid encryption key. Must be 32 characters long.');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.ALGORITHM, encryptionKey);
    const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedText: string, key?: string): string {
    const encryptionKey = key || process.env.ENCRYPTION_KEY;

    if (!encryptionKey || encryptionKey.length !== this.KEY_LENGTH) {
      throw new Error('Invalid encryption key. Must be 32 characters long.');
    }

    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipher(this.ALGORITHM, encryptionKey);
    const decrypted = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');

    return decrypted;
  }
}

// Base integration service class
export abstract class BaseIntegrationService {
  protected tenantId: string;
  protected integrationAccount: any;

  constructor(tenantId: string, integrationAccount: any) {
    this.tenantId = tenantId;
    this.integrationAccount = integrationAccount;
  }

  protected decryptToken(token: string): string {
    return EncryptionService.decrypt(token);
  }

  protected encryptToken(token: string): string {
    return EncryptionService.encrypt(token);
  }

  abstract testConnection(): Promise<boolean>;
  abstract syncData(): Promise<any>;
  abstract getStatus(): Promise<any>;
}



// HTTP client wrapper for API calls
export class IntegrationHttpClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'SLICT-ERP/1.0',
      ...headers,
    };
  }

  async get(endpoint: string, params?: Record<string, any>) {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    return this.handleResponse(response);
  }

  async post(endpoint: string, data?: any) {
    const url = new URL(endpoint, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: this.headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse(response);
  }

  async put(endpoint: string, data?: any) {
    const url = new URL(endpoint, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: this.headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse(response);
  }

  async delete(endpoint: string) {
    const url = new URL(endpoint, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: this.headers,
    });

    return this.handleResponse(response);
  }

  private async handleResponse(response: Response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${data.message || response.statusText}`);
    }

    return data;
  }
}

// Logging utility for integration activities
export class IntegrationLogger {
  static async log(
    tenantId: string,
    integration: string,
    action: string,
    status: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO',
    message?: string,
    requestData?: any,
    responseData?: any,
    errorMessage?: string,
    duration?: number,
    itemsCount?: number
  ) {
    try {
      const { prisma } = await import('@/lib/prisma');

      // Map status to match Prisma enum
      const prismaStatus = status === 'ERROR' ? 'FAILED' : status === 'SUCCESS' ? 'SUCCESS' : 'PENDING';

      await prisma.integrationLog.create({
        data: {
          tenantId,
          integration,
          action,
          status: prismaStatus as any,
          requestData,
          responseData,
          errorMessage,
        },
      });
    } catch (error) {
      console.error('Failed to log integration activity:', error);
    }
  }

  static async logSuccess(
    tenantId: string,
    integrationAccountId: string,
    action: string,
    message?: string,
    requestData?: any,
    responseData?: any,
    duration?: number,
    itemsCount?: number
  ) {
    return this.log(tenantId, integrationAccountId, action, 'SUCCESS', message, requestData, responseData, undefined, duration, itemsCount);
  }

  static async logError(
    tenantId: string,
    integrationAccountId: string,
    action: string,
    errorMessage: string,
    requestData?: any,
    duration?: number
  ) {
    return this.log(tenantId, integrationAccountId, action, 'ERROR', undefined, requestData, undefined, errorMessage, duration);
  }
}
