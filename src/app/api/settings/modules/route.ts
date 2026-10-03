import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { formatSuccessResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';
import {
  getAllModules,
  getModulesByCategory,
  MODULE_CATEGORIES,
  getEnabledModules,
} from '@/lib/modules';


export const dynamic = 'force-dynamic';
/**
 * GET /api/settings/modules
 * Get available modules and categories
 *
 * Query params:
 * - category?: string (filter by category)
 * - enabled?: 'true' | 'false' (filter by enabled status for current user)
 */
export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category');
    const enabledFilter = searchParams.get('enabled');

    let modules = getAllModules();

    // Filter by category if specified
    if (categoryFilter) {
      modules = getModulesByCategory(categoryFilter);
    }

    // Filter by enabled status for current user if specified
    // Type assertion needed until Prisma client is regenerated
    const userWithPermissions = user as typeof user & { modulePermissions?: Record<string, unknown> };
    
    if (enabledFilter === 'true' && userWithPermissions.modulePermissions) {
      const userPermissions = userWithPermissions.modulePermissions as Record<string, {
        enabled: boolean;
        view: boolean;
        create: boolean;
        edit: boolean;
        delete: boolean;
      }>;
      modules = getEnabledModules(userPermissions);
    }

    return NextResponse.json(
      formatSuccessResponse({
        modules,
        categories: MODULE_CATEGORIES,
        userPermissions: userWithPermissions.modulePermissions || null,
      }, 'Modules retrieved successfully'),
      { status: 200 }
    );
  }, 'Failed to fetch modules');
}

