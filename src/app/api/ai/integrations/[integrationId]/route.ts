import { NextResponse } from 'next/server';
import { deleteIntegrationConfig, upsertIntegrationConfig } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('edit');
    const { integrationId } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const integrations = await upsertIntegrationConfig(tenantId, {
      ...body,
      id: integrationId,
    });
    return NextResponse.json(integrations);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error updating integration:', error);
    return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('delete');
    const { integrationId } = await params;
    const integrations = await deleteIntegrationConfig(tenantId, integrationId);
    return NextResponse.json(integrations);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error deleting integration:', error);
    return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 });
  }
}
