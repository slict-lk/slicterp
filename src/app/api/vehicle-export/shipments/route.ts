import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateShipmentReadiness } from '@/apps/vehicle-export/utils';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';

// GET /api/vehicle-export/shipments - List shipments (Module F)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const where: any = { tenantId };
        if (status && status !== 'all') {
            where.status = status;
        }

        const shipments = await prisma.exportShipment.findMany({
            where,
            include: {
                vehicles: {
                    select: {
                        id: true,
                        stockNumber: true,
                        make: true,
                        model: true,
                        status: true,
                    },
                },
                _count: {
                    select: { vehicles: true },
                },
            },
            orderBy: { etd: 'desc' },
        });

        return NextResponse.json({ shipments });
    } catch (error) {
        console.error('Shipments fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
    }
}

// POST /api/vehicle-export/shipments - Create shipment (REQ-F1)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const body = await request.json();

        // Generate shipment number
        const year = new Date().getFullYear();
        const prefix = `SHP-${year}-`;
        const lastShipment = await prisma.exportShipment.findFirst({
            where: { tenantId, shipmentNumber: { startsWith: prefix } },
            orderBy: { shipmentNumber: 'desc' },
        });

        let sequence = 1;
        if (lastShipment) {
            const lastSeq = parseInt(lastShipment.shipmentNumber.split('-')[2], 10);
            sequence = lastSeq + 1;
        }
        const shipmentNumber = `${prefix}${String(sequence).padStart(3, '0')}`;

        const shipment = await prisma.exportShipment.create({
            data: {
                tenantId,
                shipmentNumber,
                vesselName: body.vesselName || 'TBD',
                voyageNumber: body.voyageNumber || 'TBD',
                shippingLine: body.shippingLine || 'TBD',
                departurePort: body.departurePort,
                destinationPort: body.destinationPort,
                etd: body.etd ? new Date(body.etd) : new Date(),
                eta: body.eta ? new Date(body.eta) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
                consignee: body.consignee,
                status: 'BOOKED',
            },
        });

        try {
            await publishModuleMutationEvent({
                tenantId,
                module: 'vehicle-export',
                entity: 'shipment',
                event: 'created',
                actorId: String(session.user?.id || 'vehicle-export-api'),
                payload: {
                    shipmentId: shipment.id,
                    shipmentNumber: shipment.shipmentNumber,
                    status: shipment.status,
                },
            });
        } catch (publishError) {
            console.error('Failed to publish shipment created event:', { shipmentId: shipment.id, shipmentNumber: shipment.shipmentNumber, error: publishError });
        }

        return NextResponse.json({ shipment }, { status: 201 });
    } catch (error) {
        console.error('Shipment create error:', error);
        return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 });
    }
}

// PUT /api/vehicle-export/shipments - Assign vehicles to shipment
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { shipmentId, vehicleIds, action } = body;

        if (action === 'assign') {
            // Get shipment to check destination
            const shipment = await prisma.exportShipment.findUnique({
                where: { id: shipmentId },
            });

            if (!shipment) {
                return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
            }

            // Validate each vehicle for compliance
            const errors: string[] = [];
            for (const vehicleId of vehicleIds) {
                const vehicle = await prisma.exportVehicle.findUnique({
                    where: { id: vehicleId },
                });

                if (vehicle) {
                    const validation = validateShipmentReadiness({
                        mashoStatus: vehicle.mashoStatus,
                        jaaiStatus: vehicle.jaaiStatus,
                        destinationPort: shipment.destinationPort,
                    });

                    if (!validation.isReady) {
                        errors.push(`${vehicle.stockNumber}: ${validation.errors.join(', ')}`);
                    }
                }
            }

            if (errors.length > 0) {
                return NextResponse.json({
                    error: 'Compliance check failed',
                    details: errors,
                }, { status: 400 });
            }

            // Assign vehicles
            await prisma.exportVehicle.updateMany({
                where: { id: { in: vehicleIds } },
                data: {
                    shipmentId,
                    status: 'READY_TO_SHIP',
                },
            });
        } else if (action === 'ship') {
            // Mark shipment as sailed
            await prisma.exportShipment.update({
                where: { id: shipmentId },
                data: { status: 'SAILED' },
            });

            // Update all vehicles
            await prisma.exportVehicle.updateMany({
                where: { shipmentId },
                data: { status: 'SHIPPED' },
            });
        } else if (action === 'deliver') {
            // Mark shipment as arrived
            await prisma.exportShipment.update({
                where: { id: shipmentId },
                data: { status: 'ARRIVED' },
            });

            // Update all vehicles
            await prisma.exportVehicle.updateMany({
                where: { shipmentId },
                data: { status: 'DELIVERED' },
            });
        }

        const shipment = await prisma.exportShipment.findUnique({
            where: { id: shipmentId },
            include: { vehicles: true },
        });

        const eventMap: Record<string, string> = {
            assign: 'vehicles_assigned',
            ship: 'shipped',
            deliver: 'delivered',
        };
        const eventName = eventMap[action];

        if (eventName) {
            try {
                await publishModuleMutationEvent({
                    tenantId: session.user.tenantId,
                    module: 'vehicle-export',
                    entity: 'shipment',
                    event: eventName,
                    actorId: String(session.user?.id || 'vehicle-export-api'),
                    payload: {
                        shipmentId,
                        action,
                        ...(vehicleIds ? { vehicleIds } : {}),
                    },
                });
            } catch (publishError) {
                console.error('Failed to publish shipment mutation event:', { shipmentId, actorId: session.user?.id, error: publishError });
            }
        }

        return NextResponse.json({ shipment });
    } catch (error) {
        console.error('Shipment update error:', error);
        return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 });
    }
}
