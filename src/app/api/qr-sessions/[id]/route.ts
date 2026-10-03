import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Poll session status (Desktop calls this every 2s)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const tenant = await getOrCreateDefaultTenant();

        const session = await prisma.qRSession.findFirst({
            where: { id, tenantId: tenant.id },
        });

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        // Check if expired
        if (new Date() > session.expiresAt) {
            await prisma.qRSession.update({
                where: { id },
                data: { status: 'EXPIRED' },
            });
            return NextResponse.json({
                id: session.id,
                status: 'EXPIRED',
                scannedData: null,
            });
        }

        return NextResponse.json({
            id: session.id,
            status: session.status,
            context: session.context,
            scannedData: session.scannedData,
            scannedBy: session.scannedBy,
        });
    } catch (error) {
        console.error('Error fetching QR session:', error);
        return NextResponse.json(
            { error: 'Failed to fetch QR session' },
            { status: 500 }
        );
    }
}

// Update session with scanned data (Phone calls this)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await request.json();

        const session = await prisma.qRSession.findFirst({
            where: { id },
        });

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        // Check if expired
        if (new Date() > session.expiresAt) {
            return NextResponse.json(
                { error: 'Session has expired' },
                { status: 410 }
            );
        }

        // Check if already scanned
        if (session.status !== 'WAITING') {
            return NextResponse.json(
                { error: 'Session has already been used' },
                { status: 409 }
            );
        }

        const updated = await prisma.qRSession.update({
            where: { id },
            data: {
                status: 'SCANNED',
                scannedData: data.scannedData,
                scannedBy: data.scannedBy,
            },
        });

        return NextResponse.json({
            id: updated.id,
            status: updated.status,
            scannedData: updated.scannedData,
            message: 'Data sent to PC successfully',
        });
    } catch (error) {
        console.error('Error updating QR session:', error);
        return NextResponse.json(
            { error: 'Failed to update QR session' },
            { status: 500 }
        );
    }
}

// Cancel/expire session
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.qRSession.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting QR session:', error);
        return NextResponse.json(
            { error: 'Failed to delete QR session' },
            { status: 500 }
        );
    }
}
