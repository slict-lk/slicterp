import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { postToGL, resolveAccountCodes } from '@/lib/accounting/gl-bridge';
import { recordStockIn } from '@/lib/inventory/inventory-bridge';

// GET /api/vehicle-export/vehicles - List vehicles (Module C)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');

        const where: any = { tenantId };

        if (status && status !== 'all') {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { stockNumber: { contains: search, mode: 'insensitive' } },
                { chassisNumber: { contains: search, mode: 'insensitive' } },
                { make: { contains: search, mode: 'insensitive' } },
                { model: { contains: search, mode: 'insensitive' } },
            ];
        }

        const vehicles = await prisma.exportVehicle.findMany({
            where,
            include: {
                customer: {
                    select: { id: true, name: true, country: true },
                },
                photos: {
                    take: 1,
                    select: { url: true },
                },
                _count: {
                    select: { yardJobs: true, bids: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ vehicles });
    } catch (error) {
        console.error('Vehicles fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }
}

// POST /api/vehicle-export/vehicles - Create vehicle from auction (REQ-C1)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const body = await request.json();

        // Check for duplicate chassis number ONLY if provided
        const chassisNumber = body.chassisNumber?.trim() || null;

        if (chassisNumber) {
            const existingVehicle = await prisma.exportVehicle.findUnique({
                where: { chassisNumber },
            });

            if (existingVehicle) {
                return NextResponse.json({ error: `Vehicle with Chassis Number ${chassisNumber} already exists in inventory (Stock #${existingVehicle.stockNumber}).` }, { status: 409 });
            }
        }

        // Retry logic for stockNumber race conditions
        const createVehicleWithRetry = async (retryCount = 0): Promise<any> => {
            const year = new Date().getFullYear();
            const prefix = `SL-${year}-`;
            // Use global sequence (remove tenantId filter) to avoid unique constraint violations
            const lastVehicle = await prisma.exportVehicle.findFirst({
                where: { stockNumber: { startsWith: prefix } },
                orderBy: { stockNumber: 'desc' },
            });

            let sequence = 1;
            if (lastVehicle) {
                const lastSeq = parseInt(lastVehicle.stockNumber.split('-')[2], 10);
                if (!isNaN(lastSeq)) sequence = lastSeq + 1;
            }
            const stockNumber = `${prefix}${String(sequence).padStart(4, '0')}`;

            try {
                const newVehicle = await prisma.$transaction(async (tx) => {
                    const vehicle = await tx.exportVehicle.create({
                        data: {
                            tenantId,
                            stockNumber,
                            chassisNumber, // Use the processed null/string value
                            make: body.make,
                            model: body.model,
                            year: body.year,
                            month: body.month,
                            engineCode: body.engineCode,
                            engineCc: body.engineCc, // Added
                            fuelType: body.fuelType,
                            color: body.color,
                            transmission: body.transmission,
                            mileage: body.mileage,
                            purchasePrice: body.purchasePrice,
                            auctionHouse: body.auctionHouse,
                            auctionDate: body.auctionDate ? new Date(body.auctionDate) : null,
                            lotNumber: body.lotNumber,
                            auctionGrade: body.auctionGrade,
                            auctionFee: body.auctionFee ?? 0,
                            customerId: body.customerId,
                            status: 'WON_AT_AUCTION',
                            photos: body.photos && body.photos.length > 0 ? {
                                create: body.photos.map((url: string) => ({
                                    url,
                                    tag: 'Auction',
                                    isPublic: true,
                                }))
                            } : undefined,
                        },
                    });

                    // Auto-create yard inspection job (REQ-D1)
                    await tx.yardJob.create({
                        data: {
                            tenantId,
                            vehicleId: vehicle.id,
                            title: 'Initial Inspection',
                            type: 'INSPECTION_PREP',
                            status: 'TODO',
                            notes: body.inspectionNotes || 'Inspect vehicle upon arrival at yard',
                            proofPhotos: [],
                        },
                    });

                    return vehicle;
                });

                return { vehicle: newVehicle, stockNumber };
            } catch (error: any) {
                if (error.code === 'P2002' && error.meta?.target?.includes('stockNumber') && retryCount < 3) {
                    return createVehicleWithRetry(retryCount + 1);
                }
                throw error;
            }
        };

        const { vehicle, stockNumber } = await createVehicleWithRetry();

        // --- INTEGRATE WITH MASTER INVENTORY MODULE ---
        const defaultWarehouse = await prisma.invWarehouse.findFirst({ where: { tenantId, isDefault: true } })
            || await prisma.invWarehouse.findFirst({ where: { tenantId } });

        if (defaultWarehouse) {
            await recordStockIn('IN', {
                tenantId,
                productId: `VEH-${vehicle.id}`,
                productName: `${body.year} ${body.make} ${body.model} (Chassis: ${chassisNumber || 'Unknown'})`,
                productCategory: 'Vehicle Export',
                productPrice: Number(body.purchasePrice ?? 0) * 1.2, // Rough 20% margin for catalog
                warehouseId: defaultWarehouse.id,
                quantity: 1, // Serialized stock
                unitCost: Number(body.purchasePrice ?? 0) + Number(body.auctionFee ?? 0),
                sourceModule: 'vehicle-export',
                sourceDocument: vehicle.id,
                reference: stockNumber
            }).catch(e => console.error("Failed to sync vehicle inventory inflow:", e));
        }

        try {
            const purchaseAccounts = await resolveAccountCodes(tenantId, 'vehicle-export', 'VEHICLE_PURCHASE');
            if (purchaseAccounts && body.purchasePrice > 0) {
                await postToGL({
                    tenantId,
                    sourceModule: 'vehicle-export',
                    sourceDocumentId: vehicle.id,
                    sourceDocumentType: 'ExportVehicle',
                    eventType: 'VEHICLE_PURCHASE',
                    reference: `VE-PUR-${stockNumber}`,
                    description: `Vehicle Purchase - ${stockNumber} (${body.make} ${body.model})`,
                    date: new Date(),
                    lines: [
                        { accountCode: purchaseAccounts.debitCode, debit: Number(body.purchasePrice), credit: 0, description: 'Vehicle Inventory' },
                        { accountCode: purchaseAccounts.creditCode, debit: 0, credit: Number(body.purchasePrice), description: 'Accounts Payable' }
                    ]
                });
            }
            const feeAccounts = await resolveAccountCodes(tenantId, 'vehicle-export', 'AUCTION_FEE');
            if (feeAccounts && body.auctionFee > 0) {
                await postToGL({
                    tenantId,
                    sourceModule: 'vehicle-export',
                    sourceDocumentId: vehicle.id,
                    sourceDocumentType: 'ExportVehicle',
                    eventType: 'AUCTION_FEE',
                    reference: `VE-FEE-${stockNumber}`,
                    description: `Auction Fee - ${stockNumber}`,
                    date: new Date(),
                    lines: [
                        { accountCode: feeAccounts.debitCode, debit: Number(body.auctionFee), credit: 0, description: 'Auction Fee Expense' },
                        { accountCode: feeAccounts.creditCode, debit: 0, credit: Number(body.auctionFee), description: 'Accounts Payable' }
                    ]
                });
            }
        } catch (error: any) {
            console.error('[SYSTEM ALERT] GL Bridge error (vehicle purchase):', {
                tenantId,
                eventType: ['VEHICLE_PURCHASE', 'AUCTION_FEE'],
                stockNumber,
                vehicleId: vehicle.id,
                error: error.message
            });
            // Continue allowing creation, but system logged for persistence queue 
        }

        try {
            await publishModuleMutationEvent({
                tenantId,
                module: 'vehicle-export',
                entity: 'vehicle',
                event: 'created',
                actorId: String(session.user?.id || 'vehicle-export-api'),
                payload: {
                    vehicleId: vehicle.id,
                    stockNumber: vehicle.stockNumber,
                    status: vehicle.status,
                },
            });
        } catch (publishError) {
            console.error('Failed to publish vehicle created event:', { tenantId, vehicleId: vehicle.id, stockNumber: vehicle.stockNumber, error: publishError });
        }

        return NextResponse.json({ vehicle }, { status: 201 });
    } catch (error: any) {
        console.error('Vehicle create error:', error);

        if (error.code === 'P2002' && error.meta?.target?.includes('chassisNumber')) {
            return NextResponse.json({ error: 'A vehicle with this Chassis Number already exists.' }, { status: 409 });
        }

        return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 });
    }
}
