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
        const addresses = await prisma.shopCustomerAddress.findMany({
            where: { customerId: customer.id },
            orderBy: { createdAt: 'desc' }
        });

        // If no addresses found, check if customer has a primary address on their profile and return it as a default
        // (Optional logic, but good for migration)
        if (addresses.length === 0) {
            const profile = await prisma.shopCustomer.findUnique({
                where: { id: customer.id }
            });
            if (profile?.address) {
                return NextResponse.json([{
                    id: 'primary',
                    type: 'Primary',
                    address: profile.address,
                    city: profile.city || '',
                    postalCode: profile.postalCode || '',
                    isDefault: true
                }]);
            }
        }

        return NextResponse.json(addresses);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const customer = await getCustomer(req);
    if (!customer) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, address, city, postalCode, phone, type, isDefault } = body;

        if (!address || !city) {
            return NextResponse.json({ error: 'Address and City are required' }, { status: 400 });
        }

        const newAddress = await prisma.shopCustomerAddress.create({
            data: {
                customerId: customer.id,
                name,
                address,
                city,
                postalCode,
                phone,
                type: type || 'Shipping',
                isDefault: isDefault || false
            }
        });

        return NextResponse.json(newAddress);
    } catch (error) {
        console.error('Error adding address:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
