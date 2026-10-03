
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/vehicle-export/wallet/[customerId]
export async function GET(request: NextRequest, { params }: { params: Promise<{ customerId: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { customerId } = await params;

        const wallet = await (prisma as any).exportWallet.findUnique({
            where: { customerId },
        });


        // Return empty wallet structure if not found (balance 0)
        if (!wallet) {
            return NextResponse.json({
                balance: 0,
                currency: 'USD',
                customerId
            });
        }

        return NextResponse.json(wallet);
    } catch (error) {
        console.error('Error fetching wallet:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
