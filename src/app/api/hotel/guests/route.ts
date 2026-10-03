import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');

        if (!tenantId) {
            return NextResponse.json(
                { error: 'Tenant ID is required' },
                { status: 400 }
            );
        }

        const guests = await prisma.guestProfile.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(guests);
    } catch (error) {
        console.error('Failed to fetch guests:', error);
        return NextResponse.json(
            { error: 'Failed to fetch guests' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tenantId, email, firstName, lastName } = body;

        if (!tenantId || !email || !firstName || !lastName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check for duplicate email
        const existing = await prisma.guestProfile.findFirst({
            where: { tenantId, email },
        });

        if (existing) {
            return NextResponse.json(
                { message: 'Guest with this email already exists' },
                { status: 409 }
            );
        }

        const guest = await prisma.guestProfile.create({
            data: {
                tenantId,
                email,
                firstName,
                lastName,
                phone: body.phone,
                nationality: body.nationality,
                isVIP: body.isVIP || false,
                vipLevel: body.vipLevel,
            },
        });

        return NextResponse.json(guest);
    } catch (error) {
        console.error('Failed to create guest:', error);
        return NextResponse.json(
            { error: 'Failed to create guest' },
            { status: 500 }
        );
    }
}
