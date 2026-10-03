import { requireAuth, requirePermission } from '@/lib/auth';

type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import' | 'approve';

export async function requireTenantContext(options?: {
  moduleId?: string;
  action?: PermissionAction;
}) {
  const user = options?.moduleId && options?.action
    ? await requirePermission(options.moduleId, options.action)
    : await requireAuth();

  if (!user?.tenantId) {
    throw new Error('Unauthorized');
  }

  return {
    user,
    tenantId: user.tenantId as string,
  };
}

