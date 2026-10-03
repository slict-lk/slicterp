import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/inventory/suppliers - List suppliers
export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();

        const suppliers = await prisma.invSupplier.findMany({
            where: {
                tenantId: tenant.id,
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
    }
}

// POST /api/inventory/suppliers - Create a supplier
export async function POST(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const body = await request.json();

        if (!body.name) {
            return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });
        }

        const supplier = await prisma.invSupplier.create({
            data: {
                tenantId: tenant.id,
                name: body.name,
                contactName: body.contactPerson || body.contactName,
                email: body.email,
                phone: body.phone,
                address: body.address,
                taxId: body.taxId,
                notes: body.notes,
                isActive: body.isActive !== false,
            },
        });

        return NextResponse.json(supplier, { status: 201 });
    } catch (error) {
        console.error('Error creating supplier:', error);
        return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
    }
}
