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

        const event = await prisma.hotelEvent.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { registrations: true }
                }
            }
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json(event);
    } catch (error: any) {
        console.error('Error fetching event:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
