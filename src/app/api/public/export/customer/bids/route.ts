
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPublicApiAuthorized } from '@/lib/public-api-auth';

export const dynamic = 'force-dynamic';

// GET /api/public/export/customer/bids?subdomain=...&email=...
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!isPublicApiAuthorized(authHeader)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');
    const email = searchParams.get('email');

    if (!subdomain || !email) {
        return NextResponse.json({ error: 'Subdomain and Email required' }, { status: 400 });
    }

    try {
        const tenant = await prisma.tenant.findFirst({
            where: { OR: [{ subdomain }, { domain: subdomain }] },
            select: { id: true }
        });

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const customer = await prisma.exportCustomer.findFirst({
            where: { tenantId: tenant.id, email }
        });

        if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

        const bids = await prisma.exportBid.findMany({
            where: { customerId: customer.id },
            orderBy: { createdAt: 'desc' },
            include: {
                vehicle: {
                    select: {
                        make: true,
                        model: true,
                        year: true,
                        photos: {
                            take: 1,
                            select: { url: true }
                        }
                    }
                }
            }
        });

        return NextResponse.json(bids);
    } catch (error) {
        console.error('Fetch bids error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT /api/public/export/customer/bids
export async function PUT(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!isPublicApiAuthorized(authHeader)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { subdomain, email, bidId, amount, notes } = body;

        if (!subdomain || !email || !bidId || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const tenant = await prisma.tenant.findFirst({
            where: { OR: [{ subdomain }, { domain: subdomain }] },
            select: { id: true }
        });

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const customer = await prisma.exportCustomer.findFirst({
            where: { tenantId: tenant.id, email }
        });

        if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

        const bid = await prisma.exportBid.findFirst({
            where: { id: bidId, customerId: customer.id }
        });

        if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

        // Check if bid is editable (PENDING or APPROVED)
        if (bid.status !== 'PENDING' && bid.status !== 'APPROVED') {
            return NextResponse.json({ error: 'Cannot update bid in current status' }, { status: 400 });
        }

        // WALLET CHECK: Ensure customer has funds (Real-world logic)
        const wallet = await prisma.exportWallet.findUnique({
            where: { customerId: customer.id }
        });

        if (!wallet || wallet.balance.toNumber() <= 0) {
            return NextResponse.json({
                error: 'Insufficient funds. Please top up your wallet to bid.'
            }, { status: 402 });
        }

        const updatedBid = await prisma.exportBid.update({
            where: { id: bidId },
            data: {
                maxBudget: amount,
                notes: notes !== undefined ? notes : bid.notes,
            }
        });

        return NextResponse.json({ success: true, bid: updatedBid });

    } catch (error) {
        console.error('Update bid error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
