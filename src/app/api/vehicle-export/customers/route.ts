import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ensureDefaultBranch } from '@/lib/sales-crm/bootstrap';
import { ensurePartyForExportCustomerRecord } from '@/lib/sales-crm/party-sync';

// GET /api/vehicle-export/customers - List all export customers
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        const customers = await prisma.exportCustomer.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        vehicles: true,
                        bids: true,
                    },
                },
                wallet: true,

            },
        });

        return NextResponse.json({ customers });
    } catch (error) {
        console.error('Error fetching customers:', error);
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }
}

// POST /api/vehicle-export/customers - Create a new customer
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const body = await request.json();
        const { name, email, phone, company, country, address } = body;

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        // Check for existing customer with same email in this tenant
        const existing = await prisma.exportCustomer.findFirst({
            where: { tenantId, email },
        });

        if (existing) {
            return NextResponse.json({ error: 'Customer with this email already exists' }, { status: 400 });
        }

        const customer = await prisma.exportCustomer.create({
            data: {
                tenantId,
                name,
                email,
                phone: phone || null,
                company: company || null,
                country: country || null,
                address: address || null,
                wallet: {
                    create: {
                        tenantId,
                        balance: 0,
                    }
                }
            },
            include: { wallet: true }
        });

        try {
            const branch = await ensureDefaultBranch(tenantId);
            await ensurePartyForExportCustomerRecord({
                tenantId,
                exportCustomerId: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                company: customer.company,
                country: customer.country,
                address: customer.address,
                branchId: branch.id,
            });
        } catch (syncError) {
            console.error('Export customer party sync failed (non-blocking):', syncError);
        }

        return NextResponse.json({ customer }, { status: 201 });
    } catch (error) {
        console.error('Error creating customer:', error);
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }
}
