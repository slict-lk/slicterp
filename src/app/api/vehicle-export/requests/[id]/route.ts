
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth'; // Assuming this helper exists

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getCurrentUser();
        // Strict RBAC: Only Staff/Admins can update requests
        if (!session || !session.role || !['ADMIN', 'STAFF'].includes(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { status, priority, assignedToUserId } = body;

        // Perform Update
        const updatedRequest = await prisma.vehicleRequest.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(priority && { priority }),
                ...(assignedToUserId && { assignedToUserId })
            }
        });

        // If status changed to ASSIGNED, maybe add a system note? (Optional enhancement)

        return NextResponse.json({ success: true, data: updatedRequest });

    } catch (error) {
        console.error('Failed to update request:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getCurrentUser();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const vehicleRequest = await prisma.vehicleRequest.findUnique({
            where: { id },
            include: {
                notes: {
                    orderBy: { createdAt: 'desc' }
                },
                assignedToUser: {
                    select: { name: true, email: true }
                }
            }
        });

        if (!vehicleRequest) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: vehicleRequest });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
