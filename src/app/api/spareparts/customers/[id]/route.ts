import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/spareparts/customers/[id] - Get single customer details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Updated for Next.js 15
) {
    try {
        const { id } = await params; // Await params
        const user = await getCurrentUser();

        console.log('[DEBUG] GET Customer Detail');
        console.log('[DEBUG] User:', user?.id, 'Tenant:', user?.tenantId);
        console.log('[DEBUG] Requested Customer ID:', id);

        if (!user) {
            console.log('[DEBUG] No user found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const customer = await (prisma as any).shopCustomer.findFirst({
            where: {
                id: id,
                tenantId: user.tenantId,
            },
            include: {
                // Include transactions for the "history" view
                creditHistory: {
                    orderBy: { createdAt: 'desc' },
                    take: 50, // Limit history
                },
                _count: {
                    select: { invoices: true, vehicleHistory: true }
                }
            },
        });

        console.log('[DEBUG] Found Customer (with tenant):', customer ? 'Yes' : 'No');

        if (!customer) {
            // Debug: Check if customer exists under ANY tenant
            const crossTenantCustomer = await (prisma as any).shopCustomer.findUnique({
                where: { id: id },
                select: { id: true, tenantId: true }
            });

            if (crossTenantCustomer) {
                console.log('[DEBUG] Customer exists but tenant mismatch!');
                console.log('[DEBUG] Customer Tenant:', crossTenantCustomer.tenantId);
                console.log('[DEBUG] User Tenant:', user.tenantId);

                // Allow access if user is super admin (optional, for debugging)
                // But for now, just return 404 but log it.
                // Or better, return 404 to avoid leaking existence, but we are debugging.
            } else {
                console.log('[DEBUG] Customer with ID', id, 'does not exist at all.');
            }

            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...customer,
            transactions: customer.creditHistory
        });
    } catch (error) {
        console.error('Error fetching customer:', error);
        return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
    }
}

// PATCH /api/spareparts/customers/[id] - Update customer
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Prevent updating critical credit fields directly via this endpoint if needed
        // but for now allow editing profile info

        const result = await (prisma as any).shopCustomer.updateMany({
            where: {
                id: id,
                tenantId: user.tenantId,
            },
            data: {
                name: body.name,
                phone: body.phone,
                email: body.email,
                alternatePhone: body.alternatePhone,
                address: body.address,
                city: body.city,
                postalCode: body.postalCode,
                businessName: body.businessName,
                taxId: body.taxId,
                customerType: body.customerType,
                // Make sure paymentTermDays is int
                paymentTermDays: body.paymentTermDays ? parseInt(body.paymentTermDays) : undefined,
                creditLimit: body.creditLimit ? parseFloat(body.creditLimit) : undefined,
            },
        });

        if (result.count === 0) {
            return NextResponse.json({ error: 'Customer not found or unauthorized' }, { status: 404 });
        }

        // Fetch updated customer to return
        const customer = await (prisma as any).shopCustomer.findFirst({ where: { id } });

        return NextResponse.json(customer);
    } catch (error) {
        console.error('Error updating customer:', error);
        return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
    }
}
