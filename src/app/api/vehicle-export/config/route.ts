
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/vehicle-export/config
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let config = await prisma.exportStoreConfig.findUnique({
            where: { tenantId: user.tenantId },
        });

        if (!config) {
            // Create default config if it doesn't exist
            config = await prisma.exportStoreConfig.create({
                data: {
                    tenantId: user.tenantId,
                    storeName: 'My Auto Exporter',
                    primaryColor: '#2563eb', // Blue-600
                },
            });
        }

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error fetching export store config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH /api/vehicle-export/config
export async function PATCH(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Prevent updating tenantId or id
        delete body.id;
        delete body.tenantId;

        const config = await prisma.exportStoreConfig.upsert({
            where: { tenantId: user.tenantId },
            create: {
                tenantId: user.tenantId,
                ...body,
            },
            update: body,
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error updating export store config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
