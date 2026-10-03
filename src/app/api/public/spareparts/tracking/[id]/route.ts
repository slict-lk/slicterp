
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const subdomain = searchParams.get('subdomain');

        if (!subdomain) {
            return new NextResponse('Subdomain required', { status: 400 });
        }

        // Resolve tenant
        const tenant = await prisma.tenant.findUnique({
            where: { subdomain },
            select: { id: true }
        });

        if (!tenant) {
            return new NextResponse('Tenant not found', { status: 404 });
        }

        // Fetch Invoice for tracking
        const order = await prisma.shopInvoice.findFirst({
            where: {
                invoiceNumber: id,
                tenantId: tenant.id
            },
            select: {
                invoiceNumber: true,
                status: true,
                paymentStatus: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!order) {
            return new NextResponse('Order not found', { status: 404 });
        }

        // Logic to determine steps based on status
        // For tracking, "Shipped" and "Delivered" imply the order fulfillment is complete.
        // Payment can be paid while order is still processing/shipping (especially for online orders).
        const isCompleted = order.status === 'COMPLETED';
        const isConfirmed = order.status !== 'DRAFT';

        // Mocking estimated delivery for now as schema doesn't have it
        const estimatedDelivery = new Date(order.createdAt);
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

        const trackingData = {
            id: order.invoiceNumber,
            status: isCompleted ? 'Completed' : order.status,
            date: order.createdAt.toLocaleDateString(),
            estimatedDelivery: estimatedDelivery.toLocaleDateString(),
            steps: [
                { title: 'Order Placed', completed: true, date: order.createdAt.toLocaleDateString() },
                { title: 'Processing', completed: isConfirmed, date: isConfirmed ? order.updatedAt.toLocaleDateString() : 'Pending' },
                { title: 'Shipped', completed: isCompleted, date: 'Pending' }, // Need shipping status in schema
                { title: 'Delivered', completed: isCompleted, date: 'Pending' },
            ]
        };

        return NextResponse.json(trackingData);

    } catch (error) {
        console.error('Track Order Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
