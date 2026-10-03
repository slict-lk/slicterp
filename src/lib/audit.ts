/**
 * Audit Log System
 * Tracks all critical operations across the ERP system
 */

import prisma from './prisma';

const client = prisma as any;

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
}

export enum AuditResource {
  USER = 'USER',
  ROLE = 'ROLE',
  CUSTOMER = 'CUSTOMER',
  LEAD = 'LEAD',
  OPPORTUNITY = 'OPPORTUNITY',
  ORDER = 'ORDER',
  INVOICE = 'INVOICE',
  PAYMENT = 'PAYMENT',
  PRODUCT = 'PRODUCT',
  INVENTORY = 'INVENTORY',
  EMPLOYEE = 'EMPLOYEE',
  PROJECT = 'PROJECT',
  TASK = 'TASK',
  REPORT = 'REPORT',
  SETTINGS = 'SETTINGS',
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  tenantId: string;
  createdAt: Date;
}

/**
 * Log an audit event
 */
export async function logAudit({
  action,
  resource,
  resourceId,
  userId,
  userName,
  userEmail,
  ipAddress,
  userAgent,
  changes,
  metadata,
  tenantId,
}: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        action,
        resource,
        resourceId,
        userId,
        userName,
        userEmail,
        ipAddress,
        userAgent,
        changes: changes || {},
        metadata: metadata || {},
        tenantId,
      },
    });
  } catch (error) {
    // Log to console but don't throw - audit failures shouldn't break operations
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceId: string,
  tenantId: string
): Promise<AuditLogEntry[]> {
  try {
    const logs = await client.auditLog.findMany({
      where: {
        resourceId,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to last 100 entries
    });

    return logs as AuditLogEntry[];
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  userId: string,
  tenantId: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  try {
    const logs = await client.auditLog.findMany({
      where: {
        userId,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs as AuditLogEntry[];
  } catch (error) {
    console.error('Failed to fetch user audit logs:', error);
    return [];
  }
}

/**
 * Get recent audit logs
 */
export async function getRecentAuditLogs(
  tenantId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const logs = await client.auditLog.findMany({
      where: {
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs as AuditLogEntry[];
  } catch (error) {
    console.error('Failed to fetch recent audit logs:', error);
    return [];
  }
}

/**
 * Search audit logs
 */
export async function searchAuditLogs({
  tenantId,
  action,
  resource,
  userId,
  startDate,
  endDate,
  limit = 100,
}: {
  tenantId: string;
  action?: AuditAction;
  resource?: AuditResource;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  try {
    const logs = await client.auditLog.findMany({
      where: {
        tenantId,
        ...(action && { action }),
        ...(resource && { resource }),
        ...(userId && { userId }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs as AuditLogEntry[];
  } catch (error) {
    console.error('Failed to search audit logs:', error);
    return [];
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(tenantId: string): Promise<{
  totalLogs: number;
  byAction: Record<string, number>;
  byResource: Record<string, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
}> {
  try {
    const [total, byAction, byResource, topUsers] = await Promise.all([
      client.auditLog.count({ where: { tenantId } }),
      client.auditLog.groupBy({
        by: ['action'],
        where: { tenantId },
        _count: true,
      }),
      client.auditLog.groupBy({
        by: ['resource'],
        where: { tenantId },
        _count: true,
      }),
      client.auditLog.groupBy({
        by: ['userId', 'userName'],
        where: { tenantId },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalLogs: total,
      byAction: byAction.reduce((acc: Record<string, number>, item: any) => {
        acc[item.action] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byResource: byResource.reduce((acc: Record<string, number>, item: any) => {
        acc[item.resource] = item._count;
        return acc;
      }, {} as Record<string, number>),
      topUsers: topUsers.map((user: any) => ({
        userId: user.userId,
        userName: user.userName,
        count: user._count,
      })),
    };
  } catch (error) {
    console.error('Failed to get audit stats:', error);
    return {
      totalLogs: 0,
      byAction: {},
      byResource: {},
      topUsers: [],
    };
  }
}

/**
 * Clean up old audit logs (data retention policy)
 */
export async function cleanupOldAuditLogs(
  tenantId: string,
  daysToKeep: number = 90
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await client.auditLog.deleteMany({
      where: {
        tenantId,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  } catch (error) {
    console.error('Failed to cleanup audit logs:', error);
    return 0;
  }
}
