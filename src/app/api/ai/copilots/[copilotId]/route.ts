import { NextResponse } from 'next/server';
import { deleteCopilotConfig, upsertCopilotConfig } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ copilotId: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('edit');
    const { copilotId } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    // Pick allowed fields only
    const { label, module, allowedIntents, dataSources, responseMode, actionPermissions, enabled, welcomeMessage } = body;
    const copilots = await upsertCopilotConfig(tenantId, {
      label, module, allowedIntents, dataSources, responseMode, actionPermissions, enabled, welcomeMessage,
      id: copilotId,
    });
    return NextResponse.json(copilots);
  } catch (error: any) {
    const errStatus = error instanceof Response ? error.status : error?.status;
    if (errStatus === 401 || errStatus === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: errStatus });
    }
    console.error('Error updating copilot:', error);
    return NextResponse.json({ error: 'Failed to update copilot' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ copilotId: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('delete');
    const { copilotId } = await params;
    const copilots = await deleteCopilotConfig(tenantId, copilotId);
    return NextResponse.json(copilots);
  } catch (error: any) {
    const errStatus = error instanceof Response ? error.status : error?.status;
    if (errStatus === 401 || errStatus === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: errStatus });
    }
    console.error('Error deleting copilot:', error);
    return NextResponse.json({ error: 'Failed to delete copilot' }, { status: 500 });
  }
}
