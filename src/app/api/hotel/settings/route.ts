import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hotel/settings
 * Returns the HotelConfig for the logged-in user's tenant
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Get or create HotelConfig
        let config = await prisma.hotelConfig.findUnique({
            where: { tenantId }
        });

        if (!config) {
            // Get tenant info for defaults
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId }
            });

            config = await prisma.hotelConfig.create({
                data: {
                    tenantId,
                    hotelName: tenant?.name || 'My Hotel',
                    primaryColor: tenant?.primaryColor || '#1a73e8',
                }
            });
        }

        return NextResponse.json(config);

    } catch (error: any) {
        console.error('Error fetching hotel settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/hotel/settings
 * Updates the HotelConfig for the logged-in user's tenant
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const body = await request.json();

        // Remove fields that shouldn't be updated directly
        const { id, tenantId: _, createdAt, updatedAt, ...updateData } = body;

        const config = await prisma.hotelConfig.upsert({
            where: { tenantId },
            update: updateData,
            create: {
                tenantId,
                ...updateData,
            }
        });

        return NextResponse.json(config);

    } catch (error: any) {
        console.error('Error updating hotel settings:', error);
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        );
    }
}
