import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postToGL, resolveAccountCodes } from '@/lib/accounting/gl-bridge';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

// GET /api/hotel/bookings/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const booking = await prisma.hotelBooking.findUnique({
            where: { id },
            include: { room: true }
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        return NextResponse.json(booking);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/hotel/bookings/[id] - Update Status (Check-In/Out)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();

        const updateData: any = {
            status: body.status,
            updatedAt: new Date(),
        };

        let finalBooking;
        // Handle Check-In specific fields
        if (body.status === 'CHECKED_IN') {
            // Validate deposit
            let deposit = 0;
            if (body.depositAmount !== undefined && body.depositAmount !== null && body.depositAmount !== '') {
                deposit = parseFloat(body.depositAmount);
                if (isNaN(deposit) || deposit < 0 || deposit > 1000000) {
                    return NextResponse.json({ error: 'Invalid deposit amount' }, { status: 400 });
                }
            }

            const existingBooking = await prisma.hotelBooking.findUnique({ where: { id }, select: { tenantId: true } });
            if (!existingBooking) {
                return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
            }
            const tenantIdStr = existingBooking.tenantId;

            updateData.checkedInAt = body.checkedInAt ? new Date(body.checkedInAt) : new Date();
            updateData.checkedInBy = body.checkedInBy;
            updateData.idVerified = body.idVerified;
            updateData.paymentMethod = body.paymentMethod;
            updateData.depositAmount = deposit;

            // Transact action create + booking update
            finalBooking = await prisma.$transaction(async (tx) => {
                await tx.frontDeskAction.create({
                    data: {
                        bookingId: id,
                        actionType: 'CHECK_IN',
                        performedBy: body.checkedInBy || 'Unknown',
                        tenantId: tenantIdStr,
                        details: {
                            paymentMethod: body.paymentMethod,
                            deposit: deposit
                        }
                    }
                });
                return tx.hotelBooking.update({
                    where: { id },
                    data: updateData
                });
            });

            if (deposit > 0 && tenantIdStr) {
                try {
                    const accounts = await resolveAccountCodes(tenantIdStr, 'hotel', 'GUEST_DEPOSIT');
                    if (accounts) {
                        await postToGL({
                            tenantId: tenantIdStr,
                            sourceModule: 'hotel',
                            sourceDocumentId: id,
                            sourceDocumentType: 'HotelBooking',
                            eventType: 'GUEST_DEPOSIT',
                            reference: `HT-DEP-${id.slice(-6)}`,
                            description: `Guest Deposit - Booking ${id.slice(-6)}`,
                            date: new Date(),
                            lines: [
                                { accountCode: accounts.debitCode, debit: deposit, credit: 0, description: 'Cash/Bank' },
                                { accountCode: accounts.creditCode, debit: 0, credit: deposit, description: 'Guest Deposit Liability' }
                            ]
                        });
                    }
                } catch (error) {
                    console.error('GL Bridge error (guest deposit):', error);
                }
            }
        }

        // Handle Check-Out specific fields
        if (body.status === 'CHECKED_OUT') {
            updateData.checkedOutAt = body.checkedOutAt ? new Date(body.checkedOutAt) : new Date();

            const existingBooking = await prisma.hotelBooking.findUnique({
                where: { id },
                select: { id: true }
            });

            if (!existingBooking) {
                return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
            }

            try {
                finalBooking = await prisma.$transaction(async (tx) => {
                    const booking = await tx.hotelBooking.update({
                        where: { id },
                        data: updateData
                    });
                    await tx.hotelRoom.update({
                        where: { id: booking.roomId },
                        data: { housekeepingStatus: 'DIRTY' }
                    });
                    return booking;
                });
            } catch (error: any) {
                if (error.code === 'P2025') {
                    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
                }
                throw error;
            }
        }

        if (!finalBooking && body.status !== 'CHECKED_IN' && body.status !== 'CHECKED_OUT') {
            finalBooking = await prisma.hotelBooking.update({
                where: { id },
                data: updateData,
            });
        }

        return NextResponse.json(finalBooking);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/hotel/bookings/[id] - Update Details
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();

        const booking = await prisma.hotelBooking.update({
            where: { id },
            data: {
                status: body.status,
                specialRequests: body.specialRequests,
                checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
                checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
                guestProfileId: body.guestProfileId,
            },
        });

        return NextResponse.json(booking);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/hotel/bookings/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        await prisma.hotelBooking.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
