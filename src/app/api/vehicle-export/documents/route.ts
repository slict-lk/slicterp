
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/vehicle-export/documents
// Get docs for a vehicle (query param vehicleId)
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const vehicleId = searchParams.get('vehicleId');

        if (!vehicleId) {
            return NextResponse.json({ error: 'Vehicle ID required' }, { status: 400 });
        }

        const doc = await (prisma as any).documentDispatch.findUnique({
            where: { vehicleId },
        });

        return NextResponse.json(doc); // Can be null
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/vehicle-export/documents
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { vehicleId, courierName, trackingNumber, recipientName, recipientAddress, status } = body;

        // BL Surrender Check: Verify Invoice is PAID
        // Must cast to any because ExportInvoice is a new model
        const invoice = await (prisma as any).exportInvoice.findUnique({
            where: { vehicleId }
        });

        if (!invoice || invoice.status !== 'PAID') {
            return NextResponse.json({
                error: 'Cannot dispatch documents. Invoice must be fully PAID before BL surrender.',
                detail: invoice ? `Current status: ${invoice.status}` : 'No invoice generated'
            }, { status: 403 }); // Forbidden
        }

        const doc = await (prisma as any).documentDispatch.upsert({
            where: { vehicleId },
            create: {
                tenantId: user.tenantId,
                vehicleId,
                courierName,
                trackingNumber,
                recipientName,
                recipientAddress,
                status: status || 'IN_TRANSIT',
            },
            update: {
                courierName,
                trackingNumber,
                recipientName,
                recipientAddress,
                status,
                sentDate: new Date(), // Update sent date on modify? Or keep original? Assuming update touches it.
            }
        });

        return NextResponse.json(doc);
    } catch (error) {
        console.error('Error saving document dispatch:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
