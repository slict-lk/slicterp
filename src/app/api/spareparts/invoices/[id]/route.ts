import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { confirmInvoice, cancelInvoice } from '@/apps/spareparts/api';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{
        id: string;
    }>
}

// GET /api/spareparts/invoices/[id] - Get invoice details
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const invoice = await (prisma as any).shopInvoice.findFirst({
            where: {
                id,
                tenantId: user.tenantId,
            },
            include: {
                customer: {
                    select: {
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
                items: {
                    select: {
                        id: true,
                        productName: true,
                        productSku: true,
                        quantity: true,
                        unitPrice: true,
                        discountPercent: true,
                        discountAmount: true,
                        lineTotal: true,
                    },
                },
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        method: true,
                        createdAt: true,
                    },
                },
                appliedPromos: {
                    include: {
                        promotion: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                type: true,
                                discountType: true
                            }
                        }
                    }
                }
            },
        });

        // Fetch Tax Registration Number separately
        const config = await (prisma as any).sparePartsConfig.findUnique({
            where: { tenantId: user.tenantId },
            select: { taxRegistrationNumber: true }
        });

        if (invoice) {
            (invoice as any).tenant = {
                sparePartsConfig: {
                    taxRegistrationNumber: config?.taxRegistrationNumber
                }
            };
        }

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        return NextResponse.json({ invoice });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
    }
}

// PATCH /api/spareparts/invoices/[id] - Update status
export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action, reason } = body;

        if (action === 'CONFIRM') {
            const invoice = await confirmInvoice(id, user.tenantId);
            return NextResponse.json(invoice);
        } else if (action === 'COMPLETE') {
            const invoice = await prisma.shopInvoice.update({
                where: { id },
                data: { status: 'COMPLETED' }
            });
            return NextResponse.json(invoice);
        } else if (action === 'CANCEL') {
            const invoice = await cancelInvoice(id, reason || 'Cancelled by user', user.tenantId);
            return NextResponse.json(invoice);
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Error updating invoice:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to update invoice'
        }, { status: 500 });
    }
}
