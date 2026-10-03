import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
    try {
        // TODO: Incorporate tenant-scoped sequencing
        const sequenceNumber = `INV-${crypto.randomUUID().toUpperCase()}`;

        return NextResponse.json({ number: sequenceNumber });
    } catch (error) {
        console.error('Failed to generate next invoice number:', error);
        return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 });
    }
}
