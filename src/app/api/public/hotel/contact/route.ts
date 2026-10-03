import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/public/hotel/contact
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            tenantId,
            firstName,
            lastName,
            email,
            phone,
            subject,
            message,
            inquiryType
        } = body;

        if (!tenantId || !firstName || !lastName || !email || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const inquiry = await prisma.contactInquiry.create({
            data: {
                tenantId,
                firstName,
                lastName,
                email,
                phone,
                subject,
                message,
                inquiryType,
                status: 'NEW'
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Thank you for your message. We will get back to you shortly.',
            id: inquiry.id
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating contact inquiry:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
