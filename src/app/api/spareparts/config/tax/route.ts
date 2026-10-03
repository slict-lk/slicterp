
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const config = await prisma.sparePartsConfig.findUnique({
            where: { tenantId: user.tenantId },
            select: {
                isTaxEnabled: true,
                taxRegistrationNumber: true
            }
        });

        if (!config) {
            // Return defaults if not found (though seed should ensure it)
            return NextResponse.json({ isTaxEnabled: true, taxRegistrationNumber: '' });
        }

        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { isTaxEnabled, taxRegistrationNumber } = body;

        // Ensure config exists
        let config = await prisma.sparePartsConfig.findUnique({
            where: { tenantId: user.tenantId }
        });

        if (!config) {
            // Should create? Yes
            // Need other required fields? Check schema.
            // But we typically assume config exists.
            /*
            config = await prisma.sparePartsConfig.create({
                data: {
                    tenantId: user.tenantId,
                    storeName: 'My Store', // Default
                    // ... other defaults
                    isTaxEnabled: isTaxEnabled,
                    taxRegistrationNumber: taxRegistrationNumber
                }
            });
            */
            // For now, simpler update or create if using upsert
        }

        const updated = await prisma.sparePartsConfig.upsert({
            where: { tenantId: user.tenantId },
            update: {
                isTaxEnabled,
                taxRegistrationNumber
            },
            create: {
                tenantId: user.tenantId,
                // Minimal required fields
                storeName: 'My Store',
                primaryColor: '#C8102E',
                isTaxEnabled,
                taxRegistrationNumber
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update Config Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
