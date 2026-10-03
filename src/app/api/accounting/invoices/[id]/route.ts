import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';

export const dynamic = 'force-dynamic';

// GET /api/accounting/invoices/[id] - Get invoice details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { tenantId } = await requireTenantContext({ moduleId: 'accounting', action: 'view' });
        const resolvedParams = await params;

        const invoice = await prisma.invoice.findFirst({
            where: {
                id: resolvedParams.id,
                tenantId
            },
            include: {
                lines: true,
                customer: true,
                vendor: true,
                payments: true
            }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        return NextResponse.json(invoice);
    } catch (error: any) {
        if (error instanceof Response || error?.status === 401 || error?.status === 403) {
            return error instanceof Response ? error : NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status || 403 });
        }
        console.error('Error fetching invoice:', error);
        return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
    }
}

// PATCH /api/accounting/invoices/[id] - Update invoice status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { tenantId } = await requireTenantContext({ moduleId: 'accounting', action: 'edit' });
        const resolvedParams = await params;

        let body: any;
        try {
            body = await request.json();
        } catch (parseErr) {
            return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }

        const invoice = await prisma.invoice.findFirst({
            where: {
                id: resolvedParams.id,
                tenantId
            }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const validStatuses = ['DRAFT', 'OPEN', 'PAID', 'OVERDUE', 'VOID'];
        if (body.status && !validStatuses.includes(body.status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id: resolvedParams.id, tenantId },
            data: {
                ...(body.status && { status: body.status }),
                // other fields can be added here if needed
            }
        });

        return NextResponse.json(updatedInvoice);
    } catch (error: any) {
        if (error instanceof Response || error?.status === 401 || error?.status === 403) {
            return error instanceof Response ? error : NextResponse.json({ error: error.message || 'Forbidden' }, { status: error.status || 403 });
        }
        console.error('Error updating invoice:', error);
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }
}
