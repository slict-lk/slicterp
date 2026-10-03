import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';

// GET /api/vehicle-export/vehicles/[id] - Vehicle detail
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const vehicle = await prisma.exportVehicle.findFirst({
            where: { id, tenantId: session.user.tenantId },
            include: {
                customer: true,
                shipment: true,
                photos: true,
                bids: {
                    include: { customer: true },
                    orderBy: { createdAt: 'desc' },
                },
                yardJobs: {
                    orderBy: { createdAt: 'desc' },
                },
                documents: true,
                invoice: true,
            },
        });




        if (!vehicle) {
            return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }

        return NextResponse.json({ vehicle });
    } catch (error) {
        console.error('Vehicle fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch vehicle' }, { status: 500 });
    }
}

// PUT /api/vehicle-export/vehicles/[id] - Update vehicle
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Build update data
        const updateData: any = {};

        // Vehicle details
        const allowedFields = [
            'make', 'model', 'year', 'month', 'engineCode', 'fuelType',
            'mileage', 'engineCc', 'location',
            'status', 'purchasePrice', 'fobPrice', 'cifPrice', 'isPublished',
            'shakenStatus', 'mashoStatus', 'jaaiStatus',
            'exportCertUrl', 'jaaiCertUrl',
            'taxAmount', 'dutyAmount', 'shippingCost',
            'customerId', 'shipmentId',
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        const vehicle = await prisma.exportVehicle.update({
            where: { id },
            data: updateData,
            include: {
                customer: true,
                shipment: true,
                photos: true,
            },
        });

        try {
            await publishModuleMutationEvent({
                tenantId: session.user.tenantId,
                module: 'vehicle-export',
                entity: 'vehicle',
                event: 'updated',
                actorId: String(session.user?.id || 'vehicle-export-api'),
                payload: {
                    vehicleId: vehicle.id,
                    stockNumber: vehicle.stockNumber,
                    status: vehicle.status,
                },
            });
        } catch (publishError) {
            console.error('Failed to publish vehicle update event:', { vehicleId: vehicle.id, stockNumber: vehicle.stockNumber, error: publishError });
        }

        return NextResponse.json({ vehicle });
    } catch (error) {
        console.error('Vehicle update error:', error);
        return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
    }
}

// DELETE /api/vehicle-export/vehicles/[id] - Delete vehicle
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Check if vehicle exists and belongs to tenant
        const vehicle = await prisma.exportVehicle.findFirst({
            where: { id, tenantId: session.user.tenantId },
        });

        if (!vehicle) {
            return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }

        // Delete vehicle and related records in a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Delete Photos
            await tx.exportVehiclePhoto.deleteMany({ where: { vehicleId: id } });

            // 2. Delete Favorites
            await tx.exportFavorite.deleteMany({ where: { vehicleId: id } });

            // 3. Delete Bids
            await tx.exportBid.deleteMany({ where: { vehicleId: id } });

            // 4. Delete Yard Jobs & Materials
            const yardJobs = await tx.yardJob.findMany({ where: { vehicleId: id } });
            if (yardJobs.length > 0) {
                const yardJobIds = yardJobs.map(j => j.id);
                await tx.yardMaterial.deleteMany({ where: { yardJobId: { in: yardJobIds } } });
                await tx.yardJob.deleteMany({ where: { vehicleId: id } });
            }

            // 5. Delete Document Dispatch
            await tx.documentDispatch.deleteMany({ where: { vehicleId: id } });

            // 6. Delete Invoices (and Items)
            const invoices = await tx.exportInvoice.findMany({ where: { vehicleId: id } });
            if (invoices.length > 0) {
                const invoiceIds = invoices.map(i => i.id);
                await tx.exportInvoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
                await tx.exportInvoice.deleteMany({ where: { vehicleId: id } });
            }

            // 7. Delete Quote Requests
            await tx.exportQuoteRequest.deleteMany({ where: { vehicleId: id } });

            // 8. Finally, Delete Vehicle
            await tx.exportVehicle.delete({ where: { id } });
        });

        try {
            await publishModuleMutationEvent({
                tenantId: session.user.tenantId,
                module: 'vehicle-export',
                entity: 'vehicle',
                event: 'deleted',
                actorId: String(session.user?.id || 'vehicle-export-api'),
                payload: {
                    vehicleId: id,
                    stockNumber: vehicle.stockNumber,
                },
            });
        } catch (publishError) {
            console.error('Failed to publish vehicle delete event:', { vehicleId: id, stockNumber: vehicle.stockNumber, error: publishError });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Vehicle delete error:', error);
        return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 });
    }
}
