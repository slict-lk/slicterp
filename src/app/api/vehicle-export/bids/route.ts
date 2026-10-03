import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';

// GET /api/vehicle-export/bids - List bids (Module B: Sales)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const where: any = { tenantId };
        if (status && status !== 'all') {
            where.status = status;
        }

        // Support filtering by proxyBidStatus for auctioneer view
        const proxyBidStatus = searchParams.get('proxyBidStatus');
        if (proxyBidStatus) {
            where.proxyBidStatus = proxyBidStatus;
        }

        const bids = await prisma.exportBid.findMany({
            where,
            include: {
                customer: true,
                vehicle: {
                    select: {
                        id: true,
                        stockNumber: true,
                        make: true,
                        model: true,
                        year: true,
                    },
                },
            },

            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ bids });
    } catch (error) {
        console.error('Bids fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 });
    }
}

// POST /api/vehicle-export/bids - Create bid (internal)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const body = await request.json();

        // Find or create customer
        let customer = await prisma.exportCustomer.findFirst({
            where: { tenantId, email: body.customerEmail },
        });

        if (!customer) {
            customer = await prisma.exportCustomer.create({
                data: {
                    tenantId,
                    email: body.customerEmail,
                    name: body.customerName,
                    phone: body.customerPhone,
                    country: body.customerCountry,
                },
            });
        }

        const bid = await prisma.exportBid.create({
            data: {
                tenantId,
                customerId: customer.id,
                requestedMake: body.requestedMake,
                requestedModel: body.requestedModel,
                maxBudget: body.maxBudget,
                currency: body.currency || 'JPY',
                notes: body.notes,
                status: 'PENDING',
            },
            include: { customer: true },
        });

        const actorId = String(session.user?.id || 'vehicle-export-api');
        try {
            await publishModuleMutationEvent({
                tenantId,
                module: 'vehicle-export',
                entity: 'bid',
                event: 'created',
                actorId,
                payload: {
                    bidId: bid.id,
                    status: bid.status,
                    customerId: bid.customerId,
                },
            });
        } catch (publishError) {
            console.error('Failed to publish bid created event:', { actorId, bidId: bid.id, error: publishError });
        }

        return NextResponse.json({ bid }, { status: 201 });
    } catch (error) {
        console.error('Bid create error:', error);
        return NextResponse.json({ error: 'Failed to create bid' }, { status: 500 });
    }
}
