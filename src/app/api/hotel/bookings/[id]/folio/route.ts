import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { differenceInDays } from 'date-fns';
import { postToGL, resolveAccountCodes } from '@/lib/accounting/gl-bridge';
import { recordStockOut } from '@/lib/inventory/inventory-bridge';

// Documented default margin for auto-created hotel inventory items
const DEFAULT_COST_MARGIN = 0.4;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const booking = await prisma.hotelBooking.findUnique({
            where: { id },
            include: {
                room: {
                    select: {
                        roomNumber: true,
                        roomType: true,
                        basePrice: true,
                    }
                },
                folioCharges: {
                    orderBy: { chargedAt: 'desc' },
                }
            }
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // Ensure we send back calculated totals if needed, though UI does it too
        return NextResponse.json(booking);
    } catch (error) {
        console.error('Failed to fetch folio:', error);
        return NextResponse.json(
            { error: 'Failed to fetch folio' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { type, description, amount, quantity } = body;

        if (!type || typeof type !== 'string' || type.trim() === '' || !description || typeof description !== 'string' || description.trim() === '') {
            return NextResponse.json({ error: 'Invalid type or description' }, { status: 400 });
        }

        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const parsedQuantity = Number(quantity) > 0 ? Number(quantity) : 1;

        // Fetch booking to get tenantId
        const booking = await prisma.hotelBooking.findUnique({
            where: { id },
            select: { tenantId: true }
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        const charge = await prisma.folioCharge.create({
            data: {
                bookingId: id,
                chargeType: type,
                description,
                amount: parsedAmount,
                quantity: parsedQuantity,
                tenantId: booking.tenantId
            }
        });

        // Also update totalAmount in booking if needed? 
        // Typically PMS keeps room rate and extras separate, but let's update totalAmount for easy query
        // Actually, let's NOT update totalAmount to keep it as room revenue, and calculating total bill on fly.
        // OR: Update totalAmount to be inclusive of all? 
        // Answer: usually better to keep totalAmount as the "Room Rate Total", and calculate bill dynamically.
        // However, for simplicity in `payment` logic, sometimes beneficial to update `totalAmount`.
        // Use a computed field? No. Let's stick to on-the-fly calc in UI/API for now.

        // --- INTEGRATE WITH MASTER INVENTORY MODULE ---
        if (type === 'MINIBAR' || type === 'F_B') {
            const defaultWarehouse = await prisma.invWarehouse.findFirst({ where: { tenantId: booking.tenantId, isDefault: true } })
                || await prisma.invWarehouse.findFirst({ where: { tenantId: booking.tenantId } });

            if (defaultWarehouse) {
                // Determine a safe pseudo-ID for auto-syncing if it doesn't exist
                const getCanonicalProductId = (desc: string) => {
                    const lookup: Record<string, string> = {
                        'soda': 'HOTEL-MINIBAR-SODA',
                        'water': 'HOTEL-MINIBAR-WATER',
                        'beer': 'HOTEL-MINIBAR-BEER',
                        'snack': 'HOTEL-MINIBAR-SNACK',
                    };
                    for (const [key, val] of Object.entries(lookup)) {
                        if (desc.toLowerCase().includes(key)) return val;
                    }
                    console.warn(`No explicit mapping for hotel inventory item: ${desc}`);
                    return `HOTEL-${desc.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
                };

                const explicitProductId = body.productId;
                const canonicalId = explicitProductId || getCanonicalProductId(description);

                let category = type === 'MINIBAR' ? 'Hotel Minibar' : 'Hotel F&B';

                const margin = body.costMargin || DEFAULT_COST_MARGIN;

                await recordStockOut('OUT', {
                    tenantId: booking.tenantId,
                    productId: canonicalId,
                    productName: description,
                    productCategory: category,
                    productPrice: parsedAmount,
                    warehouseId: defaultWarehouse.id,
                    quantity: parsedQuantity,
                    unitCost: parsedAmount * margin,
                    sourceModule: 'hotel',
                    sourceDocument: charge.id,
                    reference: `FOL-${charge.id.substring(0, 6)}`
                }).catch(e => console.error("Failed to sync hotel inventory outflow:", e));
            }
        }

        // --- GL POSTING ---
        try {
            const eventType = type === 'ROOM' ? 'ROOM_CHARGE' : (type === 'F_B' ? 'FB_CHARGE' : (type === 'MINIBAR' ? 'MINIBAR_CHARGE' : 'SERVICE_CHARGE'));
            const accounts = await resolveAccountCodes(booking.tenantId, 'hotel', eventType);
            const totalCharge = parsedAmount * parsedQuantity;
            if (accounts && totalCharge > 0) {
                await postToGL({
                    tenantId: booking.tenantId,
                    sourceModule: 'hotel',
                    sourceDocumentId: charge.id,
                    sourceDocumentType: 'FolioCharge',
                    eventType,
                    reference: `HT-FOL-${charge.id.slice(-6)}`,
                    description: `Hotel Charge: ${description}`,
                    date: new Date(),
                    lines: [
                        { accountCode: accounts.debitCode, debit: totalCharge, credit: 0, description: 'Guest Receivable' },
                        { accountCode: accounts.creditCode, debit: 0, credit: totalCharge, description: 'Hotel Revenue' }
                    ]
                });
            }
        } catch (error) {
            console.error('GL Bridge error (folio charge):', error);
        }

        return NextResponse.json(charge);
    } catch (error) {
        console.error('Failed to add charge:', error);
        return NextResponse.json(
            { error: 'Failed to add charge' },
            { status: 500 }
        );
    }
}
