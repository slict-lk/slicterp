'use server';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/module-requests - List tenant's module requests
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Get all requests for this tenant
        const requests = await prisma.moduleAccessRequest.findMany({
            where: { tenantId },
            include: {
                requestedBy: { select: { id: true, name: true, email: true } },
                processedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Get tenant's currently enabled modules
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { enabledModules: true },
        });

        return NextResponse.json({
            requests,
            enabledModules: tenant?.enabledModules || [],
        });
    } catch (error) {
        console.error('Module requests fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch module requests' }, { status: 500 });
    }
}

// POST /api/module-requests - Create new module request
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId || !session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only ADMIN role can request modules
        if (session.user.role !== 'ADMIN' && !session.user.isSuperAdmin) {
            return NextResponse.json({ error: 'Only tenant admins can request module access' }, { status: 403 });
        }

        const tenantId = session.user.tenantId;
        const userId = session.user.id;
        const body = await request.json();
        const { moduleId, action, reason } = body;

        if (!moduleId || !action) {
            return NextResponse.json({ error: 'moduleId and action are required' }, { status: 400 });
        }

        if (!['ADD', 'REMOVE'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action. Must be ADD or REMOVE' }, { status: 400 });
        }

        // Check for existing PENDING request for same module
        const existingRequest = await prisma.moduleAccessRequest.findFirst({
            where: {
                tenantId,
                moduleId,
                status: 'PENDING',
            },
        });

        if (existingRequest) {
            return NextResponse.json({
                error: 'A pending request for this module already exists',
                existingRequestId: existingRequest.id,
            }, { status: 409 });
        }

        // Check if trying to add already enabled module or remove disabled module
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { enabledModules: true },
        });

        const isModuleEnabled = tenant?.enabledModules?.includes(moduleId) || false;

        if (action === 'ADD' && isModuleEnabled) {
            return NextResponse.json({ error: 'Module is already enabled' }, { status: 400 });
        }

        if (action === 'REMOVE' && !isModuleEnabled) {
            return NextResponse.json({ error: 'Module is not enabled' }, { status: 400 });
        }

        // Create the request
        const moduleRequest = await prisma.moduleAccessRequest.create({
            data: {
                tenantId,
                requestedById: userId,
                moduleId,
                action,
                reason,
                status: 'PENDING',
            },
            include: {
                requestedBy: { select: { id: true, name: true, email: true } },
            },
        });

        return NextResponse.json({ request: moduleRequest }, { status: 201 });
    } catch (error) {
        console.error('Module request create error:', error);
        return NextResponse.json({ error: 'Failed to create module request' }, { status: 500 });
    }
}
