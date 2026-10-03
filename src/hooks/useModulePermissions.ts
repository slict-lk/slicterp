'use client';

/**
 * React Hook for Module Permissions
 * Use this hook in your components to check module permissions
 */

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { hasModulePermission, getEnabledModules } from '@/lib/modules';

export interface ModulePermission {
  enabled: boolean;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export?: boolean;
  import?: boolean;
  approve?: boolean;
}

export function useModulePermissions() {
  const { data: session } = useSession();
  const user = session?.user;

  const modulePermissions = useMemo(() => {
    // Use tenantModules from session if available (tenant-level module restrictions)
    const tenantModules = user?.tenantModules as string[] || [];
    const userEnabledIds = user?.enabledModuleIds || [];

    // If tenantModules is populated, use it; otherwise fall back to user's enabledModuleIds
    const effectiveModuleIds = tenantModules.length > 0 ? tenantModules : userEnabledIds;

    // Debug logging
    console.log('🔍 useModulePermissions Debug:');
    console.log('  tenantModules:', tenantModules);
    console.log('  userEnabledIds:', userEnabledIds);
    console.log('  effectiveModuleIds:', effectiveModuleIds);
    console.log('  modulePermissions exists:', !!user?.modulePermissions);
    console.log('  modulePermissions keys:', user?.modulePermissions ? Object.keys(user.modulePermissions) : 'none');

    if (user?.modulePermissions && Object.keys(user.modulePermissions).length > 0) {
      // If tenant has module restrictions, filter permissions to only tenant-enabled modules
      if (tenantModules.length > 0) {
        const filteredPermissions: Record<string, ModulePermission> = {};
        for (const id of tenantModules) {
          if (user.modulePermissions[id]) {
            filteredPermissions[id] = user.modulePermissions[id];
          }
        }
        console.log('  Using tenant-filtered permissions');
        return filteredPermissions;
      }
      // No tenant restrictions — use user's own module permissions as-is
      console.log('  Using user modulePermissions');
      return user.modulePermissions as Record<string, ModulePermission>;
    }

    // Build permissions from effectiveModuleIds (tenant or user scope)
    const permissions: Record<string, ModulePermission> = {};
    effectiveModuleIds.forEach(id => {
      permissions[id] = {
        enabled: true,
        view: true, // Implicit view permission for enabled modules
        create: user?.role === 'ADMIN' || user?.role === 'MANAGER',
        edit: user?.role === 'ADMIN' || user?.role === 'MANAGER',
        delete: user?.role === 'ADMIN',
      };
    });

    console.log('  Built permissions from effectiveModuleIds');
    console.log('  Final permissions keys:', Object.keys(permissions));
    console.log('  Hotel in permissions:', !!permissions.hotel);

    return permissions;
  }, [user]);

  /**
   * Check if user has a specific permission for a module
   */
  const can = (
    moduleId: string,
    action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import' | 'approve'
  ): boolean => {
    // Super admins bypass all permission checks
    if (user?.isSuperAdmin) return true;
    // Regular admins must have module enabled and specific permission
    return hasModulePermission(modulePermissions, moduleId, action);
  };

  /**
   * Check if a module is enabled for the user
   */
  const isModuleEnabled = (moduleId: string): boolean => {
    const permission = modulePermissions[moduleId];
    return permission?.enabled === true;
  };

  /**
   * Get all enabled modules for the user
   */
  const enabledModules = useMemo(() => {
    return getEnabledModules(modulePermissions);
  }, [modulePermissions]);

  /**
   * Get permission object for a specific module
   */
  const getModulePermission = (moduleId: string): ModulePermission | null => {
    return modulePermissions[moduleId] || null;
  };

  /**
   * Check if user is admin (has elevated privileges)
   */
  const isAdmin = user?.role === 'ADMIN' || user?.isSuperAdmin === true;

  /**
   * Check if user is manager
   */
  const isManager = user?.role === 'MANAGER';

  /**
   * Get user's role
   */
  const role = user?.role as 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER' | undefined;

  return {
    can,
    isModuleEnabled,
    enabledModules,
    getModulePermission,
    modulePermissions,
    isAdmin,
    isManager,
    role,
    user,
  };
}

/**
 * Hook to check specific module permissions
 * @param moduleId - The module ID to check
 * @returns Object with permission flags
 */
export function useModuleAccess(moduleId: string) {
  const { can, isModuleEnabled, getModulePermission } = useModulePermissions();

  const permission = getModulePermission(moduleId);

  return {
    enabled: isModuleEnabled(moduleId),
    canView: can(moduleId, 'view'),
    canCreate: can(moduleId, 'create'),
    canEdit: can(moduleId, 'edit'),
    canDelete: can(moduleId, 'delete'),
    canExport: can(moduleId, 'export'),
    canImport: can(moduleId, 'import'),
    canApprove: can(moduleId, 'approve'),
    permission,
  };
}

