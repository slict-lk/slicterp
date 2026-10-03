import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tenantId,
            experienceId,
            guestName,
            email,
            phone,
            date,
            time,
            participants,
            specialRequests
        } = body;

        const guestEmail = email;
        const guestPhone = phone;

        if (!tenantId || !experienceId || !guestName || !guestEmail || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get experience price
        const experience = await prisma.experience.findUnique({
            where: { id: experienceId },
            select: { price: true }
        });

        const numParticipants = parseInt(participants) || 1;
        const totalAmount = (experience?.price || 0) * numParticipants;

        const bookingNumber = `EXP-${Date.now().toString(36).toUpperCase()}`;

        const booking = await prisma.experienceBooking.create({
            data: {
                tenantId,
                experienceId,
                bookingNumber,
                guestName,
                guestEmail,
                guestPhone,
                date: new Date(date),
                time,
                participants: numParticipants,
                totalAmount,
                specialRequests,
                status: 'CONFIRMED'
            },
            include: {
                experience: {
                    select: { id: true, name: true, category: true }
                }
            }
        });

        return NextResponse.json(booking, { status: 201 });
    } catch (error: any) {
        console.error('Error creating experience booking:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
