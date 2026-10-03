
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCustomerToken } from '@/lib/spareparts-jwt';


export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Authenticate Request
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        let decoded: any;

        try {
            decoded = verifyCustomerToken(token);
        } catch (err) {
            return new NextResponse('Invalid token', { status: 401 });
        }

        const { id: customerId, tenantId } = decoded;

        if (!customerId || !tenantId) {
            return new NextResponse('Invalid token payload', { status: 401 });
        }

        // 2. Fetch Invoice
        const order = await prisma.shopInvoice.findFirst({
            where: {
                OR: [
                    { id: id },
                    { invoiceNumber: id }
                ],
                customerId,
                tenantId
            },
            include: {
                items: true,
            }
        });

        if (!order) {
            return new NextResponse('Order not found', { status: 404 });
        }

        // 3. Format Response
        const formattedOrder = {
            id: order.invoiceNumber,
            date: order.createdAt.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            status: order.paymentStatus === 'PAID' ? 'Completed' : order.status,
            paymentStatus: order.paymentStatus,
            subtotal: Number(order.subtotal),
            tax: Number(order.taxAmount),
            shipping: Number(order.shippingAmount),
            total: Number(order.total),
            items: order.items.map(item => ({
                id: item.id,
                name: item.productName,
                sku: item.productSku,
                price: Number(item.unitPrice),
                quantity: Number(item.quantity),
                total: Number(item.lineTotal),
                image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=200"
            })),
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            vehicleInfo: order.vehicleInfo,
        };

        return NextResponse.json(formattedOrder);

    } catch (error) {
        console.error('Get Order Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
