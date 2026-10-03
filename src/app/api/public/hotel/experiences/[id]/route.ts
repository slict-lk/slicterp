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

        const experience = await prisma.experience.findUnique({
            where: { id },
            // No bookings included for public view
        });

        if (!experience) {
            return NextResponse.json({ error: 'Experience not found' }, { status: 404 });
        }

        return NextResponse.json(experience);
    } catch (error: any) {
        console.error('Error fetching experience:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
