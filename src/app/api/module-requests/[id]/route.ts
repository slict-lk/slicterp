'use server';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// DELETE /api/module-requests/[id] - Cancel a pending request
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
        const tenantId = session.user.tenantId;

        // Find the request
        const moduleRequest = await prisma.moduleAccessRequest.findUnique({
            where: { id },
        });

        if (!moduleRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Ensure it belongs to this tenant
        if (moduleRequest.tenantId !== tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Can only cancel PENDING requests
        if (moduleRequest.status !== 'PENDING') {
            return NextResponse.json({
                error: 'Only pending requests can be cancelled'
            }, { status: 400 });
        }

        // Update status to CANCELLED
        const updatedRequest = await prisma.moduleAccessRequest.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });

        return NextResponse.json({
            message: 'Request cancelled successfully',
            request: updatedRequest,
        });
    } catch (error) {
        console.error('Module request cancel error:', error);
        return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 });
    }
}
