import { NextResponse } from 'next/server';
import { deletePromptRecord, listPrompts, updatePromptRecord } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('edit');
    const { promptId } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    await updatePromptRecord(tenantId, promptId, body);
    const prompts = await listPrompts(tenantId);
    return NextResponse.json(prompts);
  } catch (error: any) {
    const errStatus = error instanceof Response ? error.status : error?.status;
    if (errStatus === 401 || errStatus === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: errStatus });
    }
    console.error('Error updating prompt:', error);
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('delete');
    const { promptId } = await params;
    await deletePromptRecord(tenantId, promptId);
    const prompts = await listPrompts(tenantId);
    return NextResponse.json(prompts);
  } catch (error: any) {
    const errStatus = error instanceof Response ? error.status : error?.status;
    if (errStatus === 401 || errStatus === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: errStatus });
    }
    console.error('Error deleting prompt:', error);
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
  }
}
