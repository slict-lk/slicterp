import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');

        const venue = await prisma.diningVenue.findUnique({
            where: { id },
            // We don't need to include reservations for public view
        });

        if (!venue) {
            return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
        }

        if (tenantId && venue.tenantId !== tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json(venue);
    } catch (error: any) {
        console.error('Error fetching dining venue:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
