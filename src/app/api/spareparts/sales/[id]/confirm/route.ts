import { NextRequest, NextResponse } from 'next/server';
import { confirmInvoice } from '@/apps/spareparts/api';
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
        const invoice = await confirmInvoice(id, user.tenantId);

        return NextResponse.json(invoice);
    } catch (error: any) {
        console.error('Error confirming invoice:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to confirm invoice' },
            { status: 500 }
        );
    }
}
