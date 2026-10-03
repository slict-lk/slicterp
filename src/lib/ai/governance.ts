import { requireTenantContext } from '@/lib/server/erp-context';

export type AIRole =
  | 'AI_ADMIN'
  | 'AUTOMATION_DESIGNER'
  | 'APPROVER'
  | 'OPERATOR'
  | 'VIEWER';

const KNOWN_AI_ROLES: AIRole[] = [
  'AI_ADMIN',
  'AUTOMATION_DESIGNER',
  'APPROVER',
  'OPERATOR',
  'VIEWER',
];

function parseAIRoles(role: string | null | undefined): AIRole[] {
  if (!role) {
    return ['VIEWER'];
  }

  const normalized = role.toUpperCase();

  if (normalized === 'ADMIN') {
    return ['AI_ADMIN', 'AUTOMATION_DESIGNER', 'APPROVER', 'OPERATOR', 'VIEWER'];
  }

  if (normalized === 'MANAGER') {
    return ['AUTOMATION_DESIGNER', 'APPROVER', 'OPERATOR', 'VIEWER'];
  }

  if (normalized === 'VIEWER') {
    return ['VIEWER'];
  }

  if (normalized === 'USER') {
    return ['OPERATOR', 'VIEWER'];
  }

  const explicitRoles = role
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is AIRole => KNOWN_AI_ROLES.includes(value as AIRole));

  return explicitRoles.length > 0 ? explicitRoles : ['OPERATOR', 'VIEWER'];
}

export async function requireAIAccess(action: 'view' | 'create' | 'edit' | 'delete' | 'approve' = 'view') {
  const context = await requireTenantContext({
    moduleId: 'ai',
    action,
  });

  const roles = context.user.isSuperAdmin
    ? ['AI_ADMIN', 'AUTOMATION_DESIGNER', 'APPROVER', 'OPERATOR', 'VIEWER']
    : parseAIRoles(context.user.role);

  return {
    ...context,
    aiRoles: roles,
  };
}

export async function requireAIRole(
  requiredRole: AIRole,
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve' = 'view'
) {
  const context = await requireAIAccess(action);

  if (!context.aiRoles.includes(requiredRole) && !context.aiRoles.includes('AI_ADMIN')) {
    throw new Error('Forbidden: Insufficient AI governance role');
  }

  return context;
}
