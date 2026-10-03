import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/public/export/bids - Submit an inquiry or bid request
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            subdomain,
            tenantId: providedTenantId,
            vehicleId,
            customerEmail,
            customerName,
            customerPhone,
            customerCountry,
            amount,
            message,
            requestedMake,
            requestedModel,
        } = body;

        let tenantId = providedTenantId;

        // If providedTenantId looks like a domain or matches subdomain, force lookup
        if (tenantId && (tenantId === subdomain || tenantId.includes('.'))) {
            tenantId = undefined;
        }

        // Resolve subdomain to tenantId if needed
        // Resolve subdomain to tenantId if needed
        if (!tenantId && subdomain) {
            const tenant = await prisma.tenant.findFirst({
                where: {
                    OR: [
                        { subdomain: subdomain },
                        { domain: subdomain }
                    ]
                },
                select: { id: true }
            });

            if (!tenant) {
                return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
            }
            tenantId = tenant.id;
        }

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID or Subdomain required' }, { status: 400 });
        }

        if (!customerEmail || !customerName) {
            return NextResponse.json({ error: 'Customer email and name required' }, { status: 400 });
        }

        // Find or create customer
        let customer = await prisma.exportCustomer.findFirst({
            where: {
                tenantId,
                email: customerEmail,
            },
        });

        if (!customer) {
            customer = await prisma.exportCustomer.create({
                data: {
                    tenantId,
                    name: customerName,
                    email: customerEmail,
                    phone: customerPhone || '',
                    country: customerCountry || 'Unknown',
                },
            });
        }

        // Create the bid/inquiry
        const bid = await prisma.exportBid.create({
            data: {
                tenantId,
                customerId: customer.id,
                vehicleId: vehicleId || null,
                requestedMake: requestedMake || (vehicleId ? 'From Stock' : 'General Inquiry'),
                requestedModel: requestedModel || '',
                maxBudget: amount || 0,
                currency: 'USD',
                notes: message || '',
                status: 'PENDING',
            },
        });

        return NextResponse.json({
            success: true,
            bidId: bid.id,
            message: 'Your inquiry has been submitted. We will contact you soon!',
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating bid:', error);
        return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
    }
}

// GET /api/public/export/bids - Get bids for a customer (requires auth in future)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const customerEmail = searchParams.get('email');
    const subdomain = searchParams.get('subdomain');

    if (!customerEmail || !subdomain) {
        return NextResponse.json({ error: 'Email and subdomain required' }, { status: 400 });
    }

    try {
        const tenant = await prisma.tenant.findUnique({
            where: { subdomain },
            select: { id: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const customer = await prisma.exportCustomer.findFirst({
            where: {
                tenantId: tenant.id,
                email: customerEmail,
            },
        });

        if (!customer) {
            return NextResponse.json({ data: [], meta: { total: 0 } });
        }

        const bids = await prisma.exportBid.findMany({
            where: {
                tenantId: tenant.id,
                customerId: customer.id,
            },
            include: {
                vehicle: {
                    select: {
                        id: true,
                        stockNumber: true,
                        make: true,
                        model: true,
                        year: true,
                        photos: { take: 1, select: { url: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            data: bids.map(b => ({
                id: b.id,
                status: b.status,
                amount: b.maxBudget,
                currency: b.currency,
                notes: b.notes,
                createdAt: b.createdAt,
                vehicle: b.vehicle ? {
                    id: b.vehicle.id,
                    title: `${b.vehicle.year} ${b.vehicle.make} ${b.vehicle.model}`,
                    stockNumber: b.vehicle.stockNumber,
                    mainPhoto: b.vehicle.photos[0]?.url || null,
                } : null,
            })),
            meta: { total: bids.length },
        });

    } catch (error) {
        console.error('Error fetching bids:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
