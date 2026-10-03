'use server';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PUT /api/admin/module-requests/[id] - Approve or Reject a request
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isSuperAdmin) {
            return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action, adminNotes } = body; // action = 'approve' or 'reject'

        if (!action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action. Must be approve or reject' }, { status: 400 });
        }

        // Find the request
        const moduleRequest = await prisma.moduleAccessRequest.findUnique({
            where: { id },
            include: { tenant: true },
        });

        if (!moduleRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (moduleRequest.status !== 'PENDING') {
            return NextResponse.json({
                error: 'Only pending requests can be processed'
            }, { status: 400 });
        }

        const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

        // Start transaction for approval
        const result = await prisma.$transaction(async (tx) => {
            // Update the request status
            const updatedRequest = await tx.moduleAccessRequest.update({
                where: { id },
                data: {
                    status: newStatus,
                    adminNotes,
                    processedById: session.user.id,
                    processedAt: new Date(),
                },
            });

            // If approved, update tenant and users
            if (action === 'approve') {
                const tenantId = moduleRequest.tenantId;
                const moduleId = moduleRequest.moduleId;
                const requestAction = moduleRequest.action;

                // Update tenant's enabledModules
                let newEnabledModules: string[];
                if (requestAction === 'ADD') {
                    newEnabledModules = [...(moduleRequest.tenant.enabledModules || []), moduleId];
                } else {
                    newEnabledModules = (moduleRequest.tenant.enabledModules || []).filter(m => m !== moduleId);
                }

                await tx.tenant.update({
                    where: { id: tenantId },
                    data: { enabledModules: newEnabledModules },
                });

                // Update all tenant users' modulePermissions
                const users = await tx.user.findMany({
                    where: { tenantId },
                    select: { id: true, modulePermissions: true },
                });

                for (const user of users) {
                    const currentPerms = (user.modulePermissions as Record<string, any>) || {};

                    let updatedPerms: Record<string, any>;
                    if (requestAction === 'ADD') {
                        updatedPerms = {
                            ...currentPerms,
                            [moduleId]: { enabled: true, view: true, create: true, edit: true, delete: true },
                        };
                    } else {
                        updatedPerms = { ...currentPerms };
                        delete updatedPerms[moduleId];
                    }

                    await tx.user.update({
                        where: { id: user.id },
                        data: { modulePermissions: updatedPerms },
                    });
                }

                return {
                    request: updatedRequest,
                    usersUpdated: users.length,
                    action: requestAction,
                };
            }

            return { request: updatedRequest };
        });

        return NextResponse.json({
            message: action === 'approve'
                ? `Module ${moduleRequest.action === 'ADD' ? 'added' : 'removed'} successfully. ${(result as any).usersUpdated || 0} users updated.`
                : 'Request rejected',
            ...result,
        });
    } catch (error) {
        console.error('Admin module request process error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}

// GET /api/admin/module-requests/[id] - Get single request details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isSuperAdmin) {
            return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
        }

        const { id } = await params;

        const moduleRequest = await prisma.moduleAccessRequest.findUnique({
            where: { id },
            include: {
                tenant: { select: { id: true, name: true, companyName: true, enabledModules: true } },
                requestedBy: { select: { id: true, name: true, email: true } },
                processedBy: { select: { id: true, name: true } },
            },
        });

        if (!moduleRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        return NextResponse.json({ request: moduleRequest });
    } catch (error) {
        console.error('Admin module request fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
    }
}
