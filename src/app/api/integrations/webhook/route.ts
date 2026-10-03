import { NextRequest, NextResponse } from 'next/server';
import {
  processFacebookWebhook,
  processWhatsAppWebhook,
  processAramexWebhook,
  processDHLWebhook,
  processDomexWebhook
} from '@/lib/integrations/webhookProcessor';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch } from '@/lib/error-handler';
import { IntegrationLogger } from '@/lib/integrations/base';


export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const tenant = await getOrCreateDefaultTenant();
    const platform = request.headers.get('x-platform') as string;
    const signature = request.headers.get('x-signature') || '';
    const payload = await request.text();

    console.log(`📥 Webhook received for platform: ${platform}`);

    // Log webhook receipt
    await IntegrationLogger.log(
      tenant.id,
      'webhook_system',
      'webhook_received',
      'INFO',
      `Webhook received for platform: ${platform}`,
      { platform, signature: signature.substring(0, 10) + '...' },
      undefined,
      undefined,
      0,
      1
    );

    try {
      // Process webhook based on platform
      switch (platform) {
        case 'facebook':
          await processFacebookWebhook(tenant.id, JSON.parse(payload));
          break;
        case 'whatsapp':
          await processWhatsAppWebhook(tenant.id, JSON.parse(payload));
          break;
        case 'aramex':
          await processAramexWebhook(tenant.id, JSON.parse(payload));
          break;
        case 'dhl':
          await processDHLWebhook(tenant.id, JSON.parse(payload));
          break;
        case 'domex':
          await processDomexWebhook(tenant.id, JSON.parse(payload));
          break;
        default:
          console.log(`No handler for platform: ${platform}`);
          return NextResponse.json(
            { error: `Unsupported platform: ${platform}` },
            { status: 400 }
          );
      }

      await IntegrationLogger.log(
        tenant.id,
        'webhook_system',
        'webhook_processed',
        'SUCCESS',
        `Webhook processed successfully for platform: ${platform}`,
        { platform }
      );

      return NextResponse.json({ status: 'processed' });
    } catch (error) {
      console.error('Webhook processing failed:', error);

      await IntegrationLogger.log(
        tenant.id,
        'webhook_system',
        'webhook_processing',
        'ERROR',
        error instanceof Error ? error.message : 'Webhook processing failed',
        { platform, error: error instanceof Error ? error.message : 'Unknown error' }
      );

      return NextResponse.json(
        { error: 'Processing failed' },
        { status: 500 }
      );
    }
  }, 'Failed to process webhook');
}

export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    // Webhook verification for platforms that require it
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');
    const platform = searchParams.get('platform');

    if (mode === 'subscribe') {
      // Verify webhook token
      const expectedToken = process.env[`${platform?.toUpperCase()}_VERIFY_TOKEN`];

      if (token === expectedToken) {
        console.log(`✅ Webhook verified for platform: ${platform}`);
        return NextResponse.json(challenge);
      } else {
        console.log(`❌ Invalid verify token for platform: ${platform}`);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }, 'Failed to verify webhook');
}
