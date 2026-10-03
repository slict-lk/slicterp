/**
 * Role-Based Access Control (RBAC) System
 * Manages user permissions across the ERP system
 */

import { getAllPermissions, getModuleById } from './modules';

export type Permission = string;

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean; // System roles cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Helper to get all permissions for specific modules
 */
function getPermissionsForModules(moduleIds: string[]): Permission[] {
  const all = getAllPermissions();
  return all.filter(p => {
    const [moduleId] = p.split(':');
    return moduleIds.includes(moduleId);
  });
}

/**
 * Helper to get permissions for a specific category
 */
// function getPermissionsForCategory(categoryId: string): Permission[] {
//   // Implementation would require importing modules list
//   return []; 
// }

const ALL_PERMISSIONS = getAllPermissions();

// Predefined system roles
export const SystemRoles = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
  },
  ADMIN: {
    name: 'Admin',
    description: 'Administrative access excluding system settings',
    permissions: ALL_PERMISSIONS.filter(p => !p.startsWith('settings:')),
    isSystem: true,
  },
  MANAGER: {
    name: 'Manager',
    description: 'Department manager with view and edit access',
    permissions: ALL_PERMISSIONS.filter(p => {
      const [_, action] = p.split(':');
      return ['view', 'create', 'edit', 'approve', 'export'].includes(action);
    }),
    isSystem: true,
  },
  EMPLOYEE: {
    name: 'Employee',
    description: 'Standard employee with limited access',
    permissions: ALL_PERMISSIONS.filter(p => {
      const [_, action] = p.split(':');
      return ['view'].includes(action);
    }),
    isSystem: true,
  },
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: ALL_PERMISSIONS.filter(p => p.endsWith(':view')),
    isSystem: true,
  },

  // Custom Role Templates - can serve as starting points
  SALES_REP: {
    name: 'Sales Representative',
    description: 'Sales and CRM specialist',
    permissions: getPermissionsForModules(['sales', 'contacts', 'inventory', 'reports']),
    isSystem: true,
  },
  ACCOUNTANT: {
    name: 'Accountant',
    description: 'Financial operations specialist',
    permissions: getPermissionsForModules(['accounting', 'purchasing', 'sales', 'inventory', 'reports']),
    isSystem: true,
  },
  HR_MANAGER: {
    name: 'HR Manager',
    description: 'HR and Payroll management',
    permissions: getPermissionsForModules(['hr', 'attendance', 'payroll', 'users']),
    isSystem: true,
  }
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userPermissions: Permission[], required: Permission): boolean {
  return userPermissions.includes(required);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userPermissions: Permission[], required: Permission[]): boolean {
  return required.some(perm => userPermissions.includes(perm));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userPermissions: Permission[], required: Permission[]): boolean {
  return required.every(perm => userPermissions.includes(perm));
}

/**
 * Get permission category from permission string
 */
export function getPermissionCategory(permission: Permission): string {
  return permission.split(':')[0];
}

/**
 * Get permission action from permission string
 */
export function getPermissionAction(permission: Permission): string {
  return permission.split(':')[1];
}

/**
 * Format permission for display
 */
export function formatPermission(permission: Permission): string {
  const parts = permission.split(':');
  if (parts.length < 2) return permission;

  const [moduleId, action] = parts;
  const module = getModuleById(moduleId);
  const moduleName = module ? module.name : moduleId.charAt(0).toUpperCase() + moduleId.slice(1);
  const formattedAction = action.charAt(0).toUpperCase() + action.slice(1);

  return `${moduleName} - ${formattedAction}`;
}

/**
 * Group permissions by category (Module)
 */
export function groupPermissionsByCategory(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce((acc, permission) => {
    const category = getPermissionCategory(permission);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);
}

import { getAllModuleIds, ModulePermissions } from './modules';

/**
 * Convert string array permissions to ModulePermissions object (Legacy Support)
 * This allows the new RBAC system to feed into the existing Session/Frontend structure.
 */
export function convertPermissionsToModulePermissions(permissions: Permission[]): ModulePermissions {
  const result: ModulePermissions = {};
  const allModuleIds = getAllModuleIds();

  // Initialize all modules as disabled
  allModuleIds.forEach(moduleId => {
    result[moduleId] = {
      enabled: false,
      view: false,
      create: false,
      edit: false,
      delete: false,
      export: false,
      import: false,
      approve: false,
    };
  });

  // Apply permissions
  permissions.forEach(perm => {
    const [moduleId, action] = perm.split(':');
    if (result[moduleId]) {
      result[moduleId].enabled = true; // Implicitly enable module if any permission is present

      switch (action) {
        case 'view': result[moduleId].view = true; break;
        case 'create': result[moduleId].create = true; break;
        case 'edit': result[moduleId].edit = true; break;
        case 'delete': result[moduleId].delete = true; break;
        case 'export': result[moduleId].export = true; break;
        case 'import': result[moduleId].import = true; break;
        case 'approve': result[moduleId].approve = true; break;
      }
    }
  });

  return result;
}
