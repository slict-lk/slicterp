
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPublicApiAuthorized } from '@/lib/public-api-auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// POST /api/public/export/customer/password
export async function POST(request: NextRequest) {
    if (!isPublicApiAuthorized(request.headers.get('authorization'))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { subdomain, email, currentPassword, newPassword } = body;

        if (!subdomain || !email || !newPassword || !currentPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const tenant = await prisma.tenant.findFirst({
            where: { OR: [{ subdomain }, { domain: subdomain }] },
            select: { id: true }
        });

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const customer = await prisma.exportCustomer.findFirst({
            where: { tenantId: tenant.id, email }
        }) as any;

        if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

        // Always verify the current password. A customer with no password set cannot
        // rotate one through this endpoint - that path is an account recovery flow,
        // not a password change, and must not be reachable by supplying only an email.
        if (!customer.password) {
            return NextResponse.json({ error: 'Invalid current password' }, { status: 400 });
        }

        const isValid = await bcrypt.compare(currentPassword, customer.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid current password' }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.exportCustomer.update({
            where: { id: customer.id },
            data: { password: hashedPassword } as any
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Password update error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
