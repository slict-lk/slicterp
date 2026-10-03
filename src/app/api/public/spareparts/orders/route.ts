
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCustomerToken } from '@/lib/spareparts-jwt';


export async function GET(req: Request) {
    try {
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

        // 2. Fetch Orders
        const orders = await prisma.shopInvoice.findMany({
            where: {
                customerId,
                tenantId
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                _count: {
                    select: { items: true }
                }
            }
        });

        // 3. Format Response
        const formattedOrders = orders.map(order => ({
            id: order.invoiceNumber,
            date: order.createdAt.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            total: Number(order.total),
            status: order.paymentStatus === 'PAID' ? 'Completed' : order.status, // Fallback logic
            items: order._count.items,
            // Placeholder image for now, ideally we fetch the first item's image
            image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=200"
        }));

        return NextResponse.json(formattedOrders);

    } catch (error) {
        console.error('Get Orders Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
