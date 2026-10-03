import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getWorkflowById } from '@/apps/studio/workflow-api';
import { WorkflowEngine } from '@/apps/studio/workflow-engine';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryCatch(async () => {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const body = await req.json();

    const workflow = await getWorkflowById(id, tenant.id);
    if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

    // In a real system, this might be triggered by an event bus.
    // Here we execute it immediately for testing/manual triggers.

    // Execute async so it doesn't block the API response
    WorkflowEngine.executeWorkflow(workflow.id, tenant.id, body.context || {})
      .catch((err: any) => console.error('Workflow execution failed:', err));

    return NextResponse.json(formatSuccessResponse({ success: true, message: 'Workflow execution started' }), { status: 202 });
  });
}
