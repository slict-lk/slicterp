import { NextRequest, NextResponse } from 'next/server';
import { addInvoiceItem, removeInvoiceItem } from '@/apps/spareparts/api';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    console.log('POST /api/spareparts/sales/[id]/items called');

    try {
        const user = await getCurrentUser();
        if (!user) {
            console.log('Unauthorized - no user');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        console.log('Invoice ID from params:', id);

        const body = await request.json();
        console.log('Request body:', body);

        if (!body.productId || !body.quantity) {
            console.log('Missing productId or quantity');
            return NextResponse.json(
                { error: 'Product ID and quantity are required' },
                { status: 400 }
            );
        }

        console.log('Calling addInvoiceItem with:', { invoiceId: id, productId: body.productId, tenantId: user.tenantId });

        const item = await addInvoiceItem(id, {
            productId: body.productId,
            quantity: body.quantity,
            unitPrice: body.unitPrice,
            discountPercent: body.discountPercent,
            taxRate: body.taxRate,
            vehicleInfo: body.vehicleInfo,
        }, user.tenantId);

        console.log('Item created successfully, returning:', item);
        return NextResponse.json(item, { status: 201 });
    } catch (error: any) {
        console.error('Error adding invoice item:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to add invoice item' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('itemId');

        if (!itemId) {
            return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }

        await removeInvoiceItem(itemId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error removing invoice item:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to remove invoice item' },
            { status: 500 }
        );
    }
}
