import { NextResponse } from 'next/server';
import {
  deleteModelRecord,
  listModels,
  setDefaultModelRecord,
  updateModelRecord,
} from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('edit');
    const { modelId } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (body.action === 'set_default') {
      const models = await setDefaultModelRecord(tenantId, modelId);
      return NextResponse.json(models);
    }

    await updateModelRecord(tenantId, modelId, {
      name: body.name,
      provider: body.provider,
      modelIdValue: body.modelId,
      description: body.description,
      capabilities: body.capabilities,
      contextWindow: body.contextWindow,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
      apiEndpoint: body.apiEndpoint,
      apiKey: body.apiKey,
      isDefault: body.isDefault,
      isActive: body.isActive,
    });

    const models = await listModels(tenantId);
    return NextResponse.json(models);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error updating model:', error);
    return NextResponse.json({ error: 'Failed to update model' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('delete');
    const { modelId } = await params;
    await deleteModelRecord(tenantId, modelId);
    const models = await listModels(tenantId);
    return NextResponse.json(models);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error deleting model:', error);
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
  }
}
