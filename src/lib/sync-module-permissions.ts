/**
 * Module Permission Sync Utility
 * This utility syncs module permissions for all users when new modules are added
 */

import { prisma } from '@/lib/prisma';
import { syncModulePermissions } from '@/lib/modules';

/**
 * Sync module permissions for a specific user
 */
export async function syncUserModulePermissions(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        avatar: true,
        isActive: true,
        isSuperAdmin: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Type assertion until Prisma client is regenerated
    const userWithPermissions = user as typeof user & {
      modulePermissions?: Record<string, unknown>;
      role?: string;
    };

    // Get existing permissions or generate new ones
    const existingPermissions = (userWithPermissions.modulePermissions as Record<string, unknown>) || {};

    // Determine role for default permissions
    const role = (userWithPermissions.role as 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER') || 'USER';

    // Sync permissions (adds missing modules)
    const syncedPermissions = syncModulePermissions(existingPermissions, role);

    // Update user with synced permissions
    await prisma.user.update({
      where: { id: userId },
      data: {
        // Type assertion until Prisma is regenerated
        ...userWithPermissions,
        modulePermissions: syncedPermissions as never,
      } as never,
    });

    return {
      success: true,
      userId: user.id,
      modulesAdded: Object.keys(syncedPermissions).length - Object.keys(existingPermissions).length,
    };
  } catch (error) {
    console.error(`Failed to sync module permissions for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Sync module permissions for all users in a tenant
 */
export async function syncTenantModulePermissions(tenantId: string) {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        avatar: true,
        isActive: true,
        isSuperAdmin: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const results = [];

    for (const user of users) {
      try {
        // Type assertion until Prisma client is regenerated
        const userWithPermissions = user as typeof user & {
          modulePermissions?: Record<string, unknown>;
          role?: string;
        };

        const existingPermissions = (userWithPermissions.modulePermissions as Record<string, unknown>) || {};
        const role = (userWithPermissions.role as 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER') || 'USER';
        const syncedPermissions = syncModulePermissions(existingPermissions, role);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            ...userWithPermissions,
            modulePermissions: syncedPermissions as never
          } as never,
        });

        results.push({
          success: true,
          userId: user.id,
          email: user.email,
          modulesAdded: Object.keys(syncedPermissions).length - Object.keys(existingPermissions).length,
        });
      } catch (error) {
        results.push({
          success: false,
          userId: user.id,
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: true,
      tenantId,
      totalUsers: users.length,
      results,
    };
  } catch (error) {
    console.error(`Failed to sync module permissions for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Sync module permissions for all users in the system (Super Admin only)
 */
export async function syncAllModulePermissions() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true },
    });

    const results = [];

    for (const tenant of tenants) {
      try {
        const result = await syncTenantModulePermissions(tenant.id);
        results.push({
          syncSuccess: true,
          tenantIdentifier: tenant.id,
          tenantDisplayName: tenant.name,
          ...result,
        });
      } catch (error) {
        results.push({
          syncSuccess: false,
          tenantIdentifier: tenant.id,
          tenantDisplayName: tenant.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: true,
      totalTenants: tenants.length,
      results,
    };
  } catch (error) {
    console.error('Failed to sync module permissions for all tenants:', error);
    throw error;
  }
}

