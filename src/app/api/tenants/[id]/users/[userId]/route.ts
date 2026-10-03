import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isSuperAdmin) {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        const { id: tenantId, userId } = await params;

        // Verify user belongs to this tenant
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                tenantId: tenantId,
            },
        });

        if (!user) {
            return new NextResponse('User not found in this tenant', { status: 404 });
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting tenant user:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
