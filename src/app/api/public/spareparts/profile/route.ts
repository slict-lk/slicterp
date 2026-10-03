import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCustomerToken } from '@/lib/spareparts-jwt';


async function getCustomer(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = verifyCustomerToken(token);
        return decoded; // { id, email, tenantId, ... }
    } catch (error) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const customer = await getCustomer(req);
    if (!customer) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const profile = await prisma.shopCustomer.findUnique({
            where: { id: customer.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                city: true,
                postalCode: true,
                tenantId: true,
                tier: true,
                loyaltyPoints: true,
            }
        });

        return NextResponse.json(profile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const customer = await getCustomer(req);
    if (!customer) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, phone, address, city, postalCode } = body;

        const updatedCustomer = await prisma.shopCustomer.update({
            where: { id: customer.id },
            data: {
                name,
                phone,
                address,
                city,
                postalCode
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                tenantId: true,
                tier: true
            }
        });

        return NextResponse.json(updatedCustomer);
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
