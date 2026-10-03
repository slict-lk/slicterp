import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getWorkflowById, updateWorkflow, deleteWorkflow } from '@/apps/studio/workflow-api';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryCatch(async () => {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const workflow = await getWorkflowById(id, tenant.id);

    if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    return NextResponse.json(formatSuccessResponse(workflow));
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryCatch(async () => {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const body = await req.json();

    const workflow = await getWorkflowById(id, tenant.id);
    if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

    const updatedWorkflow = await updateWorkflow(id, tenant.id, body);
    return NextResponse.json(formatSuccessResponse(updatedWorkflow));
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryCatch(async () => {
    const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();

    const workflow = await getWorkflowById(id, tenant.id);
    if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

    await deleteWorkflow(id, tenant.id);
    return NextResponse.json(formatSuccessResponse({ success: true, message: 'Workflow deleted successfully' }));
  });
}
