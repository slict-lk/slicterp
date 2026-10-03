import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/hotel/contact - List contact inquiries (admin)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const status = searchParams.get('status');

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
        }

        const where: any = { tenantId };
        if (status) where.status = status;

        const inquiries = await prisma.contactInquiry.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(inquiries);
    } catch (error: any) {
        console.error('Error fetching contact inquiries:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/hotel/contact - Submit contact form (public)
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
