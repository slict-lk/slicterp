import { NextRequest, NextResponse } from 'next/server';
import { getCustomers, createCustomer, searchCustomers } from '@/apps/spareparts/api';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || undefined;
        const type = searchParams.get('type') || undefined;
        const status = searchParams.get('status') || undefined;

        // If search query is provided, use search function
        if (search && search.length >= 2) {
            const customers = await searchCustomers(search, user.tenantId);
            return NextResponse.json({ customers });
        }

        const customers = await getCustomers(user.tenantId, { type, status, search });
        return NextResponse.json({ customers });
    } catch (error) {
        console.error('Error fetching customers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch customers' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.name || !body.phone) {
            return NextResponse.json(
                { error: 'Name and phone are required' },
                { status: 400 }
            );
        }

        const customer = await createCustomer({
            ...body,
            tenantId: user.tenantId,
        });

        return NextResponse.json(customer, { status: 201 });
    } catch (error) {
        console.error('Error creating customer:', error);
        return NextResponse.json(
            { error: 'Failed to create customer' },
            { status: 500 }
        );
    }
}
