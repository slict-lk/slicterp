
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';
import { signCustomerToken } from '@/lib/spareparts-jwt';

// Type for customer with password (Prisma types may not be updated yet)
type CustomerWithPassword = {
    id: string;
    email: string | null;
    name: string;
    password: string | null;
    tenantId: string;
    [key: string]: unknown;
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, subdomain } = body;

        if (!email || !password || !subdomain) {
            return new NextResponse('Missing credentials', { status: 400 });
        }

        // 1. Resolve Tenant
        const tenant = await prisma.tenant.findUnique({
            where: { subdomain },
            select: { id: true, name: true, subdomain: true }
        });

        if (!tenant) {
            return new NextResponse('Invalid store.', { status: 404 });
        }

        // 2. Find Customer in this Tenant
        const customer = await prisma.shopCustomer.findFirst({
            where: {
                tenantId: tenant.id,
                email: email
            }
        }) as CustomerWithPassword | null;

        if (!customer || !customer.password) {
            return new NextResponse('Invalid email or password', { status: 401 });
        }

        // 3. Verify Password
        const isValid = await compare(password, customer.password);
        if (!isValid) {
            return new NextResponse('Invalid email or password', { status: 401 });
        }

        // 4. Create Session Token (JWT)
        const token = signCustomerToken(
            {
                id: customer.id,
                email: customer.email,
                name: customer.name,
                tenantId: tenant.id,
                storeSlug: tenant.subdomain
            },
            { expiresIn: '7d' }
        );

        // Remove password from response
        const { password: _pwd, ...customerProfile } = customer;

        return NextResponse.json({
            user: customerProfile,
            token
        });

    } catch (error) {
        console.error('Login Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

