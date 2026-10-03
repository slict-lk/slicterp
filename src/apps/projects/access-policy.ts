import { prisma } from '@/lib/prisma';

export type ProjectAction =
  | 'view'
  | 'contribute'
  | 'manage'
  | 'approve_time'
  | 'bill';

export type ProjectActor = {
  id: string;
  tenantId: string;
  role?: string | null;
  isSuperAdmin?: boolean;
  employeeId?: string | null;
};

const roleActions: Record<string, ProjectAction[]> = {
  MANAGER: ['view', 'contribute', 'manage', 'approve_time', 'bill'],
  CONTRIBUTOR: ['view', 'contribute'],
  VIEWER: ['view'],
  TIME_APPROVER: ['view', 'approve_time'],
};

export function projectRoleAllows(role: string | null | undefined, action: ProjectAction) {
  return Boolean(role && roleActions[role]?.includes(action));
}

export function isTenantAdmin(actor: ProjectActor) {
  return Boolean(actor.isSuperAdmin || actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN');
}

export async function resolveProjectActor(user: { id: string; tenantId?: string; role?: string | null; isSuperAdmin?: boolean }) {
  if (!user.tenantId) throw new Error('Unauthorized');
  const identity = await prisma.user.findFirst({
    where: { id: user.id, tenantId: user.tenantId },
    select: { employeeId: true },
  });
  return {
    id: user.id,
    tenantId: user.tenantId,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    employeeId: identity?.employeeId ?? null,
  } satisfies ProjectActor;
}

export async function getProjectAccess(actor: ProjectActor, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: actor.tenantId },
    select: { id: true, tenantId: true, visibility: true, archivedAt: true },
  });
  if (!project) return null;

  if (isTenantAdmin(actor)) {
    return { project, member: null, actions: ['view', 'contribute', 'manage', 'approve_time', 'bill'] as ProjectAction[] };
  }

  const member = await prisma.projectMember.findFirst({
    where: {
      tenantId: actor.tenantId,
      projectId,
      leftAt: null,
      OR: [
        { userId: actor.id },
        ...(actor.employeeId ? [{ employeeId: actor.employeeId }] : []),
      ],
    },
  });

  if (!member && project.visibility !== 'TENANT') return null;
  return {
    project,
    member,
    actions: member ? roleActions[member.role] ?? ['view'] : ['view'] as ProjectAction[],
  };
}

export async function requireProjectAccess(actor: ProjectActor, projectId: string, action: ProjectAction) {
  const access = await getProjectAccess(actor, projectId);
  if (!access) throw new Error('Project not found or access denied');
  if (!access.actions.includes(action)) throw new Error('Forbidden: Project access denied');
  return access;
}

export function accessibleProjectWhere(actor: ProjectActor) {
  if (isTenantAdmin(actor)) return { tenantId: actor.tenantId };
  return {
    tenantId: actor.tenantId,
    OR: [
      { visibility: 'TENANT' as const },
      { members: { some: { leftAt: null, OR: [{ userId: actor.id }, ...(actor.employeeId ? [{ employeeId: actor.employeeId }] : [])] } } },
    ],
  };
}
