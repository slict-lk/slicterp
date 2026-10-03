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
        const vehicles = await prisma.shopCustomerVehicle.findMany({
            where: { customerId: customer.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
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
        const { make, model, year, plateNumber, vin } = body;

        if (!make || !model || !year) {
            return NextResponse.json({ error: 'Make, Model and Year are required' }, { status: 400 });
        }

        const newVehicle = await prisma.shopCustomerVehicle.create({
            data: {
                customerId: customer.id,
                make,
                model,
                year: parseInt(year),
                plateNumber,
                vin
            }
        });

        return NextResponse.json(newVehicle);
    } catch (error) {
        console.error('Error adding vehicle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
