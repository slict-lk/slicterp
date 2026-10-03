import { NextRequest, NextResponse } from 'next/server';
import { recordPayment } from '@/apps/spareparts/api';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        if (!body.amount || !body.method) {
            return NextResponse.json(
                { error: 'Amount and payment method are required' },
                { status: 400 }
            );
        }

        const invoice = await recordPayment(id, {
            amount: body.amount,
            method: body.method,
            reference: body.reference,
            receivedById: user.id,
        }, user.tenantId);

        return NextResponse.json(invoice);
    } catch (error: any) {
        console.error('Error recording payment:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to record payment' },
            { status: 500 }
        );
    }
}
