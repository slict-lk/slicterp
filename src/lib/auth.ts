import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';

export { authOptions } from './auth-options';

export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user) {
      console.log('✅ Session found:', {
        email: session.user.email,
        role: session.user.role,
        tenantId: session.user.tenantId
      });
      return session.user;
    }

    console.warn('⚠️ No authenticated session');
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function requirePermission(
  moduleId: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import' | 'approve'
) {
  const user = await requireAuth();

  const permissions = (user.modulePermissions as Record<string, any>) || {};
  // Admin bypass is already handled in hasModulePermission? No, it's not.
  // We should check admin role here or trust hasModulePermission?
  // hasModulePermission checks the object. Authentication layer (this file) should handle role bypass if needed.
  // Actually, generateDefaultModulePermissions ensures Admins have all permissions enabled.
  // But let's add an explicit super admin / admin bypass for safety.

  if (user.isSuperAdmin || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return user;
  }

  const { hasModulePermission } = await import('./modules'); // Dynamic import to avoid circular dependency if any (though likely fine)

  if (!hasModulePermission(permissions, moduleId, action)) {
    throw new Error('Forbidden: Insufficient Permissions');
  }

  return user;
}

export async function requireAnyPermission(
  requirements: Array<{
    moduleId: string;
    action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import' | 'approve';
  }>
) {
  const user = await requireAuth();

  if (user.isSuperAdmin || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return user;
  }

  const permissions = (user.modulePermissions as Record<string, any>) || {};
  const { hasModulePermission } = await import('./modules');

  const allowed = requirements.some((requirement) =>
    hasModulePermission(permissions, requirement.moduleId, requirement.action)
  );

  if (!allowed) {
    throw new Error('Forbidden: Insufficient Permissions');
  }

  return user;
}
