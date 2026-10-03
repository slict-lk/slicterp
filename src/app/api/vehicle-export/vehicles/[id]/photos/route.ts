import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
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
        const { url, tag } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL required' }, { status: 400 });
        }

        const photo = await prisma.exportVehiclePhoto.create({
            data: {
                vehicleId: id,
                url,
                tag: tag || 'Gallery',
                isPublic: true,
            }
        });

        return NextResponse.json({ photo });
    } catch (error) {
        console.error('Add photo error:', error);
        return NextResponse.json({ error: 'Failed to add photo' }, { status: 500 });
    }
}
