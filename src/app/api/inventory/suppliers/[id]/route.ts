import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenant = await getOrCreateDefaultTenant();
        const { id } = await params;
        const body = await request.json();

        if (!body.name) {
            return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });
        }

        const supplier = await prisma.vendor.updateMany({
            where: {
                id,
                tenantId: tenant.id
            },
            data: {
                name: body.name,
                contactPerson: body.contactPerson || body.contactName,
                email: body.email,
                phone: body.phone,
                address: body.address,
                city: body.city,
                country: body.country,
                paymentTerms: body.paymentTerms,
                taxId: body.taxId,
                notes: body.notes,
                isActive: typeof body.isActive !== 'undefined' ? Boolean(body.isActive) : undefined,
            },
        });

        if (supplier.count === 0) {
            return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error updating supplier:', error);
        return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
    }
}
