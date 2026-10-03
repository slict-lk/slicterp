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

    const where: any = {
      tenantId: tenant.id,
      platform: {
        in: ['ARAMEX', 'DHL', 'DOMEX'],
      },
    };

    if (platform) {
      where.platform = platform;
    }

    const integrations = await (prisma as any).integrationAccount.findMany({
      where,
      include: {
        shipments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            shipments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(formatSuccessResponse(integrations));
  }, 'Failed to fetch courier integrations');
}

export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    if (!body.platform || !body.accountName) {
      return NextResponse.json(
        { error: 'Platform and account name are required' },
        { status: 400 }
      );
    }

    const { EncryptionService } = await import('@/lib/integrations/base');


    const integration = await (prisma as any).integrationAccount.create({
      data: {
        platform: body.platform,
        accountId: body.accountId || `courier_${Date.now()}`,
        accountName: body.accountName,
        apiKey: body.apiKey ? EncryptionService.encrypt(body.apiKey) : null,
        apiSecret: body.apiSecret ? EncryptionService.encrypt(body.apiSecret) : null,
        settings: {
          originCountry: body.originCountry || 'LK',
          originCity: body.originCity || 'Colombo',
          accountNumber: body.accountNumber,
        },
        tenantId: tenant.id,
      },
      include: {
        _count: {
          select: {
            shipments: true,
          },
        },
      },
    });

    return NextResponse.json(
      formatSuccessResponse(integration, 'Courier integration created successfully'),
      { status: 201 }
    );
  }, 'Failed to create courier integration');
}

