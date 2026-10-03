import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { postToGL, resolveAccountCodes } from '@/lib/accounting/gl-bridge';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';

// GET /api/vehicle-export/bids/[id]
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
        const bid = await prisma.exportBid.findFirst({
            where: { id, tenantId: session.user.tenantId },
            include: {
                customer: true,
                vehicle: true,
            },
        });

        if (!bid) {
            return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
        }

        return NextResponse.json({ bid });
    } catch (error) {
        console.error('Bid fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch bid' }, { status: 500 });
    }
}

// PUT /api/vehicle-export/bids/[id] - Approve/Reject bid (REQ-B2)
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
        const { status, adminNotes, approvedPrice } = body;

        // Validate status
        const validStatuses = ['APPROVED', 'REJECTED', 'WON', 'LOST'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        // Verify ownership
        const existingBid = await prisma.exportBid.findFirst({
            where: { id, tenantId: session.user.tenantId }
        });
        if (!existingBid) {
            return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
        }

        const updateData: Partial<{ status: string; adminNotes: string; approvedPrice: number }> = {
            status,
            adminNotes,
        };

        let parsedPrice: number | undefined;
        if (approvedPrice !== undefined && approvedPrice !== null) {
            parsedPrice = Number(approvedPrice);
            if (isNaN(parsedPrice)) {
                return NextResponse.json({ error: 'Invalid approvedPrice' }, { status: 400 });
            }
            updateData.approvedPrice = parsedPrice;
        }

        const bid = await prisma.exportBid.update({
            where: { id },
            data: updateData as any,
            include: { customer: true, vehicle: true },
        });

        // --- GL POSTING ---
        let glStatus = 'not_attempted';
        try {
            if (status === 'WON' && parsedPrice !== undefined && parsedPrice !== null && !isNaN(parsedPrice)) {
                const accounts = await resolveAccountCodes(session.user.tenantId, 'vehicle-export', 'EXPORT_SALE');
                if (accounts) {
                    await postToGL({
                        tenantId: session.user.tenantId,
                        sourceModule: 'vehicle-export',
                        sourceDocumentId: bid.id,
                        sourceDocumentType: 'ExportBid',
                        eventType: 'EXPORT_SALE',
                        reference: `VE-SALE-${bid.vehicle?.stockNumber || bid.id.slice(-6)}`,
                        description: `Vehicle Export Sale - ${bid.vehicle?.stockNumber || 'Unknown'} to ${bid.customer?.name || 'Customer'}`,
                        date: new Date(),
                        lines: [
                            { accountCode: accounts.debitCode, debit: parsedPrice, credit: 0, description: 'Accounts Receivable' },
                            { accountCode: accounts.creditCode, debit: 0, credit: parsedPrice, description: 'Export Sale Revenue' }
                        ]
                    });
                    glStatus = 'ok';
                }
            }
        } catch (error: any) {
            console.error('GL Bridge error (export bid won):', error);
            glStatus = 'failed';
            // Record failure passively
            try {
                const existingNotes = bid.adminNotes?.trim() || '';
                const newNote = `[SYSTEM ERROR] GL Posting Failed: ${error.message}`;
                await prisma.exportBid.update({
                    where: { id: bid.id },
                    data: {
                        adminNotes: existingNotes ? `${existingNotes}\n${newNote}` : newNote
                    }
                });
            } catch (noteError) {
                console.error('Failed to append GL error to adminNotes:', noteError);
            }
        }

        try {
            await publishModuleMutationEvent({
                tenantId: session.user.tenantId,
                module: 'vehicle-export',
                entity: 'bid',
                event: 'updated',
                actorId: String(session.user?.id || 'vehicle-export-api'),
                payload: {
                    bidId: bid.id,
                    status: bid.status,
                    approvedPrice: parsedPrice,
                    glStatus,
                },
            });
        } catch (publishError) {
            console.error('Failed to publish bid update event:', { bidId: bid.id, event: 'updated', error: publishError });
        }

        return NextResponse.json({ bid: { ...bid, glStatus } });
    } catch (error) {
        console.error('Bid update error:', error);
        return NextResponse.json({ error: 'Failed to update bid' }, { status: 500 });
    }
}
