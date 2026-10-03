import { prisma } from '@/lib/prisma';
import {
    CreateWorkflowInput,
    UpdateWorkflowInput,
    PaginationParams,
    PaginatedResponse,
    StudioWorkflow,
    WorkflowExecution
} from './types';
import { Prisma } from '@prisma/client';

export interface WorkflowFilters extends PaginationParams {
    search?: string;
    isActive?: boolean;
    triggerType?: string;
}

export interface ExecutionFilters extends PaginationParams {
    status?: string;
}

// ----------------------------------------------------------------------------
// WORKFLOWS
// ----------------------------------------------------------------------------

export async function getWorkflows(
    tenantId: string,
    filters?: WorkflowFilters
): Promise<PaginatedResponse<StudioWorkflow>> {
    const { skip = 0, take = 50, search, isActive, triggerType, sortBy = 'createdAt', sortOrder = 'desc' } = filters || {};

    const where: Prisma.StudioWorkflowWhereInput = {
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
        prisma.studioWorkflow.count({ where }),
        prisma.studioWorkflow.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
        }),
    ]);

    return {
        data: data as unknown as StudioWorkflow[],
        count,
        skip,
        take
    };
}

export async function getWorkflowById(id: string, tenantId: string): Promise<StudioWorkflow | null> {
    const workflow = await prisma.studioWorkflow.findFirst({
        where: { id, tenantId },
    });

    return workflow as unknown as StudioWorkflow;
}

export async function createWorkflow(
    tenantId: string,
    input: CreateWorkflowInput,
    createdById?: string
): Promise<StudioWorkflow> {
    const workflow = await prisma.studioWorkflow.create({
        data: {
            tenantId,
            name: input.name,
            description: input.description,
            triggerType: input.triggerType,
            triggerConfig: input.triggerConfig as any,
            nodes: input.nodes as any,
            edges: input.edges as any,
            isActive: input.isActive ?? false,
            createdById,
        },
    });

    return workflow as unknown as StudioWorkflow;
}

export async function updateWorkflow(
    id: string,
    tenantId: string,
    data: UpdateWorkflowInput
): Promise<StudioWorkflow> {
    const workflow = await prisma.studioWorkflow.update({
        where: { id, tenantId },
        data: {
            name: data.name,
            description: data.description,
            triggerType: data.triggerType,
            triggerConfig: data.triggerConfig as any,
            nodes: data.nodes as any,
            edges: data.edges as any,
            isActive: data.isActive,
        },
    });

    return workflow as unknown as StudioWorkflow;
}

export async function deleteWorkflow(id: string, tenantId: string) {
    const existing = await prisma.studioWorkflow.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Workflow not found');
    return prisma.studioWorkflow.delete({ where: { id } });
}

// ----------------------------------------------------------------------------
// EXECUTIONS
// ----------------------------------------------------------------------------

export async function getExecutions(
    workflowId: string,
    tenantId: string,
    filters?: ExecutionFilters
): Promise<PaginatedResponse<WorkflowExecution>> {
    const { skip = 0, take = 50, status, sortBy = 'startedAt', sortOrder = 'desc' } = filters || {};

    const where: Prisma.WorkflowExecutionWhereInput = {
        workflowId,
        workflow: { is: { tenantId } },
        ...(status && { status }),
    };

    const [count, data] = await Promise.all([
        prisma.workflowExecution.count({ where }),
        prisma.workflowExecution.findMany({
            where,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
        }),
    ]);

    return {
        data: data as unknown as WorkflowExecution[],
        count,
        skip,
        take
    };
}

export async function getExecutionById(id: string, tenantId: string): Promise<WorkflowExecution | null> {
    const execution = await prisma.workflowExecution.findFirst({
        where: { id, workflow: { is: { tenantId } } },
    });

    return execution as unknown as WorkflowExecution;
}

export async function createExecution(workflowId: string, triggerData: any): Promise<WorkflowExecution> {
    const execution = await prisma.workflowExecution.create({
        data: {
            workflowId,
            status: 'running',
            triggerData: triggerData as any,
            steps: [],
        },
    });

    return execution as unknown as WorkflowExecution;
}

export async function updateExecutionSteps(
    id: string,
    steps: any[],
    status?: 'running' | 'completed' | 'failed' | 'cancelled',
    error?: string
): Promise<WorkflowExecution> {
    const data: Prisma.WorkflowExecutionUpdateInput = {
        steps: steps as any,
    };

    if (status) {
        data.status = status;
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            data.completedAt = new Date();
        }
    }

    if (error) {
        data.error = error;
    }

    const execution = await prisma.workflowExecution.update({
        where: { id },
        data,
    });

    return execution as unknown as WorkflowExecution;
}
