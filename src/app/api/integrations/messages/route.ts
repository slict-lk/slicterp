import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { formatSuccessResponse, formatPaginatedResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    return tryCatch(async () => {
        const tenant = await getOrCreateDefaultTenant();
        const { searchParams } = new URL(request.url);
        const platform = searchParams.get('platform');
        const direction = searchParams.get('direction');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        const skip = (page - 1) * limit;

        const where: any = {
            tenantId: tenant.id,
        };

        if (platform) {
            where.platform = platform;
        }

        if (direction) {
            where.direction = direction;
        }

        const [messages, total] = await Promise.all([
            prisma.integrationMessage.findMany({
                where,
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    salesOrder: {
                        select: {
                            id: true,
                            number: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.integrationMessage.count({ where }),
        ]);

        return NextResponse.json(
            formatPaginatedResponse(messages, page, limit, total)
        );
    }, 'Failed to fetch messages');
}

export async function POST(request: NextRequest) {
    return tryCatch(async () => {
        const tenant = await getOrCreateDefaultTenant();
        const body = await request.json();

        const message = await prisma.integrationMessage.create({
            data: {
                platform: body.platform,
                direction: body.direction || 'OUTBOUND',
                senderId: body.senderId,
                senderName: body.senderName,
                recipientId: body.recipientId,
                recipientName: body.recipientName,
                messageType: body.messageType || 'TEXT',
                content: body.content,
                status: body.status || 'SENT',
                customerId: body.customerId,
                salesOrderId: body.salesOrderId,
                tenantId: tenant.id,
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                salesOrder: {
                    select: {
                        id: true,
                        number: true,
                    },
                },
            },
        });

        return NextResponse.json(
            formatSuccessResponse(message, 'Message created successfully'),
            { status: 201 }
        );
    }, 'Failed to create message');
}
