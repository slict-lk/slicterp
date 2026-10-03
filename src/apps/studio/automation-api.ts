import { prisma } from '@/lib/prisma';
import { Prisma, TriggerType } from '@prisma/client';
import { PaginationParams, PaginatedResponse } from './types';

export interface AutomationFilters extends PaginationParams {
    search?: string;
    isActive?: boolean;
    triggerType?: TriggerType;
}

export interface AutomationExecutionFilters extends PaginationParams {
    status?: string;
}

// ----------------------------------------------------------------------------
// AUTOMATION RULES
// ----------------------------------------------------------------------------

export async function getAutomationRules(
    tenantId: string,
    filters?: AutomationFilters
) {
    const { skip = 0, take = 50, search, isActive, triggerType, sortBy = 'createdAt', sortOrder = 'desc' } = filters || {};

    const where: Prisma.AutomationRuleWhereInput = {
        tenantId,
        ...(isActive !== undefined && { isActive }),
        ...(triggerType && { triggerType }),
        ...(search && {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };

    const [count, data] = await Promise.all([
        prisma.automationRule.count({ where }),
        prisma.automationRule.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
            include: {
                _count: { select: { executions: true } }
            }
        }),
    ]);

    return { data, count, skip, take };
}

export async function getAutomationRuleById(id: string, tenantId: string) {
    return prisma.automationRule.findFirst({
        where: { id, tenantId },
    });
}

export async function createAutomationRule(
    tenantId: string,
    data: {
        name: string;
        description?: string;
        triggerType: TriggerType;
        triggerConfig: any;
        conditions?: any;
        actions: any;
        isActive?: boolean;
    },
    createdById?: string
) {
    return prisma.automationRule.create({
        data: {
            tenantId,
            name: data.name,
            description: data.description,
            triggerType: data.triggerType,
            triggerConfig: data.triggerConfig,
            conditions: data.conditions,
            actions: data.actions,
            isActive: data.isActive ?? true,
            createdById,
        },
    });
}

export async function updateAutomationRule(
    id: string,
    tenantId: string,
    data: {
        name?: string;
        description?: string;
        triggerType?: TriggerType;
        triggerConfig?: any;
        conditions?: any;
        actions?: any;
        isActive?: boolean;
    }
) {
    return prisma.automationRule.updateMany({
        where: { id, tenantId },
        data,
    });
}

export async function toggleAutomationRule(id: string, tenantId: string, isActive: boolean) {
    return prisma.automationRule.updateMany({
        where: { id, tenantId },
        data: { isActive },
    });
}

export async function deleteAutomationRule(id: string, tenantId: string) {
    return prisma.automationRule.deleteMany({
        where: { id, tenantId },
    });
}

export async function incrementRunCount(id: string, tenantId: string) {
    return prisma.automationRule.updateMany({
        where: { id, tenantId },
        data: {
            runCount: { increment: 1 },
            lastRunAt: new Date(),
        },
    });
}

// ----------------------------------------------------------------------------
// AUTOMATION EXECUTIONS
// ----------------------------------------------------------------------------

export async function getAutomationExecutions(
    ruleId: string,
    tenantId: string,
    filters?: AutomationExecutionFilters
) {
    const { skip = 0, take = 50, status, sortBy = 'executedAt', sortOrder = 'desc' } = filters || {};

    const where: Prisma.AutomationExecutionWhereInput = {
        ruleId,
        rule: { tenantId },
        ...(status && { status: status as any }),
    };

    const [count, data] = await Promise.all([
        prisma.automationExecution.count({ where }),
        prisma.automationExecution.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
        }),
    ]);

    return { data, count, skip, take };
}
