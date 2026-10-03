import { prisma } from '@/lib/prisma';
import { StudioWorkflow } from './types';
import { createExecution, updateExecutionSteps } from './workflow-api';
import { createCustomRecord, updateCustomRecord, deleteCustomRecord } from './api';
import { executeAdapterAction, publishDomainEvent } from '@/lib/ai/control-plane';

export class WorkflowEngine {

    static async executeWorkflow(
        workflowId: string,
        tenantId: string,
        triggerData: any,
        options?: { allowInactive?: boolean }
    ) {
        const workflow = await prisma.studioWorkflow.findUnique({
            where: { id: workflowId }
        });

        if (!workflow || (!workflow.isActive && !options?.allowInactive) || workflow.tenantId !== tenantId) {
            console.log(`Workflow ${workflowId} skipped: not found, inactive, or tenant mismatch.`);
            return {
                ok: false,
                error: 'Workflow not found, inactive, or tenant mismatch.',
            };
        }

        // Create execution record
        const execution = await createExecution(workflow.id, triggerData);
        const steps: any[] = [];

        try {
            try {
                await publishDomainEvent({
                    id: `evt-${execution.id}`,
                    tenantId,
                    module: 'studio',
                    entity: 'workflow',
                    event: 'triggered',
                    occurredAt: new Date().toISOString(),
                    actorType: 'system',
                    actorId: (triggerData?.initiatedBy as string) || 'workflow-engine',
                    correlationId: execution.id,
                    payload: {
                        workflowId,
                        triggerSource: triggerData?.source ?? 'unknown',
                    },
                });
            } catch (publishErr: any) {
                console.error(`Workflow ${workflowId}: Failed to publish domain event:`, publishErr);
                await updateExecutionSteps(execution.id, [{
                    nodeId: 'domain-event-publish',
                    status: 'failed',
                    startedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    error: publishErr?.message || 'Failed to publish domain event',
                }], 'failed', publishErr?.message);
                return {
                    ok: false,
                    executionId: execution.id,
                    error: `Failed to publish domain event: ${publishErr?.message}`,
                };
            }

            const nodes = workflow.nodes as any[];
            const edges = workflow.edges as any[];

            // Find the trigger node
            const triggerNode = nodes.find(n => n.type === 'triggerNode');
            if (!triggerNode) throw new Error('No trigger node found');

            steps.push({
                nodeId: triggerNode.id,
                status: 'completed',
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                output: triggerData
            });

            // Simple runner: find next connected node and run sequentially
            let currentNode = triggerNode;
            let contextData = { trigger: triggerData };

            while (true) {
                // Find outgoing edge
                const edge = edges.find(e => e.source === currentNode.id);
                if (!edge) break; // End of flow

                const nextNode = nodes.find(n => n.id === edge.target);
                if (!nextNode) break;

                const stepResult = await this.executeNode(nextNode, contextData, tenantId);

                steps.push({
                    nodeId: nextNode.id,
                    status: stepResult.success ? 'completed' : 'failed',
                    startedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    output: stepResult.data,
                    error: stepResult.error
                });

                if (!stepResult.success) {
                    throw new Error(`Node ${nextNode.id} failed: ${stepResult.error}`);
                }

                // If condition node returned false, halt execution gracefully
                if (nextNode.type === 'conditionNode' && stepResult.data === false) {
                    break;
                }

                contextData = { ...contextData, [nextNode.id]: stepResult.data };
                currentNode = nextNode;
            }

            await updateExecutionSteps(execution.id, steps, 'completed');
            return {
                ok: true,
                executionId: execution.id,
            };

        } catch (e: any) {
            console.error(`Workflow ${workflowId} failed:`, e);
            await updateExecutionSteps(execution.id, steps, 'failed', e.message);
            return {
                ok: false,
                executionId: execution.id,
                error: e.message,
            };
        }
    }

    private static async executeNode(node: any, contextData: any, tenantId: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            switch (node.type) {
                case 'actionNode':
                    return await this.executeAction(node.data, contextData, tenantId);
                case 'conditionNode':
                    return await this.evaluateCondition(node.data, contextData);
                case 'delayNode': {
                    // Delay node in a serverless environment requires complex scheduling (e.g. queue).
                    // For now, this is a synchronous wait (only suitable for a few seconds).
                    const ms = (node.data?.duration || 1) * 1000;
                    await new Promise(res => setTimeout(res, Math.min(ms, 5000))); // Cap at 5s for sync
                    return { success: true, data: { delayed: ms } };
                }
                default:
                    return { success: false, error: `Unknown node type: ${node.type}` };
            }
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    private static async executeAction(actionData: any, contextData: any, tenantId: string) {
        const { actionType, config } = actionData;

        // Helper to resolve template variables like {{trigger.email}}
        const resolveVars = (template: string) => {
            if (!template || typeof template !== 'string') return template;
            return template.replace(/\{\{(.+?)\}\}/g, (_, path) => {
                return path.split('.').reduce((obj: any, key: string) => obj?.[key], contextData) ?? '';
            });
        };

        switch (actionType) {
            case 'send_email':
                // Integration with email provider
                console.log('Sending email to:', resolveVars(config.to), 'Subject:', resolveVars(config.subject));
                return { success: true, data: { sent: true } };

            case 'create_record':
                const createData = this.resolveObjectVars(config.data, contextData);
                const newRecord = await createCustomRecord(config.moduleId, tenantId, createData, 'system');
                return { success: true, data: newRecord };

            case 'update_record':
                const updateData = this.resolveObjectVars(config.data, contextData);
                const recordId = resolveVars(config.recordId);
                const updatedRecord = await updateCustomRecord(recordId, tenantId, updateData);
                return { success: true, data: updatedRecord };

            case 'webhook': {
                const url = resolveVars(config.url);
                // Validate URL to prevent SSRF
                let parsed: URL;
                try {
                    parsed = new URL(url);
                } catch {
                    throw new Error('Invalid webhook URL');
                }
                if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                    throw new Error('Webhook URL must use http or https');
                }
                // Block private/loopback addresses
                const host = parsed.hostname.toLowerCase();
                if (
                    host === 'localhost' ||
                    host === '127.0.0.1' ||
                    host === '::1' ||
                    host === '0.0.0.0' ||
                    host === '169.254.169.254' ||
                    host.endsWith('.internal') ||
                    /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)
                ) {
                    throw new Error('Webhook URL targets a disallowed address');
                }
                const payload = this.resolveObjectVars(config.payload, contextData);
                const response = await fetch(parsed.href, {
                    method: config.method || 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(10000),
                });
                const responseText = await response.text();
                return { success: response.ok, data: { status: response.status, url: parsed.href, body: responseText.slice(0, 1024) } };
            }

            case 'module_action': {
                const module = (config.module || config.moduleId || contextData.trigger?.moduleScope || 'studio') as any;
                const action = (config.action || config.actionId) as string;
                if (!action) {
                    throw new Error('module_action requires an explicit action (config.action or config.actionId must be specified)');
                }
                const payload = this.resolveObjectVars(config.payload || config.data || {}, contextData);
                const actorId = (contextData.trigger?.initiatedBy as string) || 'workflow-engine';
                const result = await executeAdapterAction({
                    tenantId,
                    userId: actorId,
                    module,
                    action,
                    input: payload,
                });
                if (!result.ok) {
                    throw new Error(result.error || 'Module action failed');
                }
                return { success: true, data: result };
            }

            default:
                throw new Error(`Unsupported action type: ${actionType}`);
        }
    }

    private static resolveObjectVars(obj: any, contextData: any): any {
        if (!obj) return obj;
        if (typeof obj === 'string') {
            return obj.replace(/\{\{(.+?)\}\}/g, (_, path) => {
                return path.split('.').reduce((o: any, k: string) => o?.[k], contextData) ?? '';
            });
        }
        if (typeof obj === 'object') {
            const resolved: any = Array.isArray(obj) ? [] : {};
            for (const [k, v] of Object.entries(obj)) {
                resolved[k] = this.resolveObjectVars(v, contextData);
            }
            return resolved;
        }
        return obj;
    }

    private static async evaluateCondition(conditionData: any, contextData: any) {
        if (!conditionData) return { success: true, data: false };
        const { field, operator, value } = conditionData;
        if (!field) return { success: true, data: false };

        // Resolve field value from context e.g. "trigger.amount"
        const actualValue = field.split('.').reduce((obj: any, key: string) => obj?.[key], contextData);

        let result = false;
        switch (operator) {
            case 'equals': result = actualValue === value; break;
            case 'not_equals': result = actualValue !== value; break;
            case 'contains': result = String(actualValue ?? '').includes(String(value)); break;
            case 'greater_than': result = Number(actualValue) > Number(value); break;
            case 'less_than': result = Number(actualValue) < Number(value); break;
        }

        return { success: true, data: result };
    }
}
