import { NextRequest, NextResponse } from 'next/server';
import { getInvoices, createInvoice } from '@/apps/spareparts/api';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || undefined;
        const paymentStatus = searchParams.get('paymentStatus') || undefined;
        const customerId = searchParams.get('customerId') || undefined;
        const source = searchParams.get('source') || undefined;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        const invoices = await getInvoices(user.tenantId, {
            status,
            paymentStatus,
            customerId,
            source,
            limit,
        });

        return NextResponse.json({ invoices });
    } catch (error) {
        console.error('Error fetching sales:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sales' },
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

        const invoice = await createInvoice({
            ...body,
            tenantId: user.tenantId,
            createdById: user.id,
        });

        try {
            await publishModuleMutationEvent({
                tenantId: user.tenantId,
                module: 'spareparts',
                entity: 'invoice',
                event: 'created',
                actorId: user.id,
                payload: {
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    status: invoice.status,
                    total: Number(invoice.total || 0),
                },
            });
        } catch (publishError) {
            console.error('Failed to publish invoice mutation event:', { tenantId: user.tenantId, invoiceId: invoice.id, userId: user.id, error: publishError });
        }

        return NextResponse.json(invoice, { status: 201 });
    } catch (error) {
        console.error('Error creating invoice:', error);
        return NextResponse.json(
            { error: 'Failed to create invoice' },
            { status: 500 }
        );
    }
}
