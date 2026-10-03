import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  archiveWorkflowDefinition,
  cloneWorkflowDefinition,
  getWorkflowDetail,
  rollbackWorkflowDefinition,
  setWorkflowEnabled,
  simulateWorkflowDefinition,
} from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';
import { WorkflowEngine } from '@/apps/studio/workflow-engine';

const db = prisma as any;

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('view');
    const { id } = await params;
    const detail = await getWorkflowDetail(tenantId, id);

    if (!detail) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error fetching workflow detail:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow detail' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, user } = await requireAIAccess('edit');
    const { id } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const existing = await db.studioWorkflow.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (body.name !== undefined || body.description !== undefined) {
      await db.studioWorkflow.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
        },
      });
    }

    if (body.isActive !== undefined) {
      await setWorkflowEnabled(tenantId, id, Boolean(body.isActive), user.id);
    }

    const detail = await getWorkflowDetail(tenantId, id);
    return NextResponse.json(detail);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error updating workflow:', error);
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (body.action === 'clone') {
      const { tenantId, user } = await requireAIAccess('create');
      const clone = await cloneWorkflowDefinition(tenantId, id, user.id);

      if (!clone) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }

      return NextResponse.json(clone, { status: 201 });
    }

    if (body.action === 'run_test') {
      const { tenantId, user } = await requireAIAccess('edit');
      const workflow = await db.studioWorkflow.findFirst({
        where: { id, tenantId },
        select: { id: true },
      });

      if (!workflow) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }

      await WorkflowEngine.executeWorkflow(
        id,
        tenantId,
        body.triggerData || {
          source: 'manual-test',
          initiatedBy: user.id,
        },
        { allowInactive: true }
      );

      const detail = await getWorkflowDetail(tenantId, id);
      return NextResponse.json({
        success: true,
        detail,
      });
    }

    if (body.action === 'archive') {
      const { tenantId, user } = await requireAIAccess('delete');
      const archived = await archiveWorkflowDefinition(tenantId, id, user.id);

      if (!archived) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }

      return NextResponse.json(archived);
    }

    if (body.action === 'rollback') {
      const { tenantId, user } = await requireAIAccess('edit');
      if (!body.versionId || typeof body.versionId !== 'string') {
        return NextResponse.json({ error: 'versionId is required for rollback' }, { status: 400 });
      }
      const rolledBack = await rollbackWorkflowDefinition(
        tenantId,
        id,
        body.versionId,
        user.id
      );

      if (!rolledBack) {
        return NextResponse.json({ error: 'Workflow version not found' }, { status: 404 });
      }

      const detail = await getWorkflowDetail(tenantId, id);
      return NextResponse.json(detail);
    }

    if (body.action === 'simulate') {
      const { tenantId } = await requireAIAccess('view');
      const simulation = await simulateWorkflowDefinition(tenantId, id, body.triggerData || {});

      if (!simulation) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }

      return NextResponse.json(simulation);
    }

    return NextResponse.json({ error: 'Unsupported workflow action' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error executing workflow action:', error);
    return NextResponse.json({ error: 'Failed to execute workflow action' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('delete');
    const { id } = await params;
    await db.studioWorkflow.deleteMany({
      where: { id, tenantId },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error deleting workflow:', error);
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
  }
}
