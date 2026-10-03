import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();

        return NextResponse.json({
            message: 'Turnover report requires period-beginning inventory snapshots which are not yet fully implemented via StockLedger History. Will use simplified COGS / Avg Inventory formula in future iteration.',
            data: []
        });

    } catch (error) {
        console.error('Error fetching inventory turnover:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
