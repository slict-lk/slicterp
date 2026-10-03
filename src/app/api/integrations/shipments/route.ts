import { formatPaginatedResponse } from '@/lib/utils/pagination';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { formatSuccessResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';


export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    if (!body.integrationId || !body.orderId || !body.recipient || !body.packages) {
      return NextResponse.json(
        { error: 'Integration ID, order ID, recipient, and packages are required' },
        { status: 400 }
      );
    }

    // Find integration
    const integration = await (prisma as any).integrationAccount.findFirst({
      where: {
        id: body.integrationId,
        tenantId: tenant.id,
        platform: {
          in: ['ARAMEX', 'DHL', 'DOMEX'],
        },
        isActive: true,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Courier integration not found' },
        { status: 404 }
      );
    }

    // Create shipment using the appropriate courier service
    const { CourierService } = await import('@/lib/integrations/courierService');

    const service = new CourierService(tenant.id, integration);

    const trackingNumber = await service.createShipment({
      orderId: body.orderId,
      recipient: body.recipient,
      packages: body.packages,
      serviceType: body.serviceType || 'STANDARD',
    });

    return NextResponse.json(
      formatSuccessResponse({
        trackingNumber,
        courier: integration.platform,
        integration: integration.accountName,
      }, 'Shipment created successfully')
    );
  }, 'Failed to create shipment');
}

export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await getOrCreateDefaultTenant();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const trackingNumber = searchParams.get('trackingNumber');
    const status = searchParams.get('status');
    const courier = searchParams.get('courier');

    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: tenant.id,
    };

    if (trackingNumber) {
      where.trackingNumber = { contains: trackingNumber, mode: 'insensitive' };
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (courier) {
      where.integrationAccount = {
        platform: courier,
      };
    }

    const [shipments, total] = await Promise.all([
      (prisma as any).shipment.findMany({
        where,
        include: {
          integrationAccount: {
            select: {
              id: true,
              platform: true,
              accountName: true,
            },
          },
          salesOrder: {
            select: {
              id: true,
              orderNumber: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).shipment.count({ where }),
    ]);

    return NextResponse.json(
      formatPaginatedResponse(shipments, page, limit, total)
    );
  }, 'Failed to fetch shipments');
}

