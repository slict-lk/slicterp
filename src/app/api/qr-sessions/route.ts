import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Create a new QR scan session
export async function POST(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const tenantId = tenant.id;
        const data = await request.json();

        // Session expires in 5 minutes
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const session = await prisma.qRSession.create({
            data: {
                context: data.context || 'PATIENT',
                status: 'WAITING',
                expiresAt,
                tenantId,
            },
        });

        // Return the session with the mobile scan URL
        return NextResponse.json({
            id: session.id,
            status: session.status,
            context: session.context,
            expiresAt: session.expiresAt,
            scanUrl: `/mobile-scan/${session.id}`,
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating QR session:', error);
        return NextResponse.json(
            { error: 'Failed to create QR session' },
            { status: 500 }
        );
    }
}

// List active sessions (for the current user)
export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();

        // Clean up expired sessions
        await prisma.qRSession.deleteMany({
            where: {
                tenantId: tenant.id,
                expiresAt: { lt: new Date() },
            },
        });

        const sessions = await prisma.qRSession.findMany({
            where: {
                tenantId: tenant.id,
                status: 'WAITING',
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error('Error fetching QR sessions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch QR sessions' },
            { status: 500 }
        );
    }
}
