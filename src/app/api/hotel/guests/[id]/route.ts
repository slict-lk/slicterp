import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const guest = await prisma.guestProfile.findUnique({
            where: { id },
            include: {
                bookings: {
                    take: 5,
                    orderBy: { checkIn: 'desc' },
                    include: {
                        room: true
                    }
                }
            }
        });

        if (!guest) {
            return NextResponse.json(
                { error: 'Guest not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(guest);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch guest' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const guest = await prisma.guestProfile.update({
            where: { id },
            data: {
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                phone: body.phone,
                nationality: body.nationality,
                isVIP: body.isVIP,
                vipLevel: body.vipLevel,
                specialNotes: body.specialNotes,
                dietaryRestrictions: body.dietaryRestrictions,
            },
        });

        return NextResponse.json(guest);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to update guest' },
            { status: 500 }
        );
    }
}
