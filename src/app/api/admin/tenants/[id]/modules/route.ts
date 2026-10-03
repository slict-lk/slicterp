'use server';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PUT /api/admin/tenants/[id]/modules - Super Admin direct module management
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isSuperAdmin) {
            return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
        }

        const { id: tenantId } = await params;
        const body = await request.json();
        const { moduleId, enabled } = body;

        if (!moduleId || typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'moduleId and enabled are required' }, { status: 400 });
        }

        // Get current tenant
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { enabledModules: true },
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        // Update enabled modules
        let newEnabledModules: string[];
        if (enabled) {
            // Add module if not already present
            newEnabledModules = tenant.enabledModules.includes(moduleId)
                ? tenant.enabledModules
                : [...tenant.enabledModules, moduleId];
        } else {
            // Remove module
            newEnabledModules = tenant.enabledModules.filter(m => m !== moduleId);
        }

        // Update tenant and all users in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update tenant
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
                if (enabled) {
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

            return { usersUpdated: users.length };
        });

        return NextResponse.json({
            message: `Module ${enabled ? 'enabled' : 'disabled'} for ${result.usersUpdated} users`,
            enabledModules: newEnabledModules,
        });
    } catch (error) {
        console.error('Admin module toggle error:', error);
        return NextResponse.json({ error: 'Failed to update modules' }, { status: 500 });
    }
}

// GET /api/admin/tenants/[id]/modules - Get tenant's enabled modules
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isSuperAdmin) {
            return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
        }

        const { id: tenantId } = await params;

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { enabledModules: true },
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        return NextResponse.json({ enabledModules: tenant.enabledModules });
    } catch (error) {
        console.error('Admin get modules error:', error);
        return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
    }
}
