import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { formatSuccessResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';
import {
  syncUserModulePermissions,
  syncTenantModulePermissions,
  syncAllModulePermissions
} from '@/lib/sync-module-permissions';


export const dynamic = 'force-dynamic';
/**
 * POST /api/settings/sync-module-permissions
 * Sync module permissions for users
 *
 * Request body:
 * - scope: 'user' | 'tenant' | 'all'
 * - userId?: string (required if scope is 'user')
 */
export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    // Type assertion until Prisma client is regenerated
    const userWithRole = user as typeof user & { isSuperAdmin?: boolean };
    const isAdmin = user.role === 'ADMIN' || userWithRole.isSuperAdmin;

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only administrators can sync module permissions.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { scope, userId } = body;

    if (!scope || !['user', 'tenant', 'all'].includes(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope. Must be "user", "tenant", or "all"' },
        { status: 400 }
      );
    }

    let result;

    switch (scope) {
      case 'user':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required when scope is "user"' },
            { status: 400 }
          );
        }
        result = await syncUserModulePermissions(userId);
        break;

      case 'tenant':
        result = await syncTenantModulePermissions(user.tenantId);
        break;

      case 'all':
        // Only super admins can sync all tenants
        if (!userWithRole.isSuperAdmin) {
          return NextResponse.json(
            { error: 'Only super admins can sync permissions for all tenants' },
            { status: 403 }
          );
        }
        result = await syncAllModulePermissions();
        break;
    }

    return NextResponse.json(
      formatSuccessResponse(result, 'Module permissions synced successfully'),
      { status: 200 }
    );
  }, 'Failed to sync module permissions');
}

