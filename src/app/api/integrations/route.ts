import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { formatSuccessResponse, formatPaginatedResponse } from '@/lib/error-handler';
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
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');

    const where: any = {
      tenantId: tenant.id,
    };

    if (platform) {
      where.platform = platform;
    }

    if (status) {
      where.isActive = status === 'active';
    }

    const integrations = await (prisma as any).integrationAccount.findMany({
      where,
      include: {
        logs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            shipments: true,
            messages: true,
            logs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(formatSuccessResponse(integrations));
  }, 'Failed to fetch integrations');
}

export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    // Validate required fields
    if (!body.platform || !body.accountName) {
      return NextResponse.json(
        { error: 'Platform and account name are required' },
        { status: 400 }
      );
    }

    // Encrypt sensitive data
    const { EncryptionService } = await import('@/lib/integrations/base');


    const integration = await (prisma as any).integrationAccount.create({
      data: {
        platform: body.platform,
        accountId: body.accountId || `acc_${Date.now()}`,
        accountName: body.accountName,
        accessToken: body.accessToken ? EncryptionService.encrypt(body.accessToken) : null,
        refreshToken: body.refreshToken ? EncryptionService.encrypt(body.refreshToken) : null,
        apiKey: body.apiKey ? EncryptionService.encrypt(body.apiKey) : null,
        apiSecret: body.apiSecret ? EncryptionService.encrypt(body.apiSecret) : null,
        webhookSecret: body.webhookSecret ? EncryptionService.encrypt(body.webhookSecret) : null,
        settings: body.settings || {},
        tenantId: tenant.id,
      },
      include: {
        _count: {
          select: {
            shipments: true,
            messages: true,
            logs: true,
          },
        },
      },
    });

    return NextResponse.json(
      formatSuccessResponse(integration, 'Integration created successfully'),
      { status: 201 }
    );
  }, 'Failed to create integration');
}

