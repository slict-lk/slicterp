import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordPayment } from '@/apps/spareparts/api';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{
        id: string;
    }>
}

// POST /api/spareparts/invoices/[id]/payments
export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const data = await request.json();

        if (!data.amount || !data.method) {
            return NextResponse.json({ error: 'Amount and method are required' }, { status: 400 });
        }

        const payment = await recordPayment(
            id,
            {
                amount: Number(data.amount),
                method: data.method,
                reference: data.reference,
                receivedById: user.id,
            },
            user.tenantId,
        );

        return NextResponse.json(payment);
    } catch (error) {
        console.error('Error recording payment:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to record payment'
        }, { status: 500 });
    }
}
