
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, name, phone, subdomain } = body;

        // 1. Validation
        if (!email || !password || !name || !phone || !subdomain) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        // 2. Resolve Tenant from Subdomain (Store Slug)
        const tenant = await prisma.tenant.findUnique({
            where: { subdomain },
            select: { id: true }
        });

        if (!tenant) {
            return new NextResponse('Invalid store.', { status: 404 });
        }

        // 3. Check if email already exists for this tenant
        const existingCustomer = await prisma.shopCustomer.findFirst({
            where: {
                tenantId: tenant.id,
                email: email
            }
        });

        if (existingCustomer) {
            return new NextResponse('Email already registered for this store.', { status: 409 });
        }

        // 4. Hash Password
        const hashedPassword = await hash(password, 12);

        // 5. Generate Customer Number
        const count = await prisma.shopCustomer.count({
            where: { tenantId: tenant.id }
        });
        const customerNumber = `${subdomain.toUpperCase()}-C${(count + 1).toString().padStart(5, '0')}`;

        // 6. Create Customer
        const customer = await prisma.shopCustomer.create({
            data: {
                tenantId: tenant.id,
                name,
                email,
                phone,
                password: hashedPassword,
                customerNumber,
                // customerType uses schema default: RETAIL
                creditEnabled: false,
            }
        });

        // Return success (excluding password)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _pwd, ...customerWithoutPassword } = customer;

        return NextResponse.json(customerWithoutPassword);

    } catch (error) {
        console.error('Registration Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
