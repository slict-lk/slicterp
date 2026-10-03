import { NextResponse } from 'next/server';
import { deletePolicyProfile, upsertPolicyProfile } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ policyId: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('edit');
    const { policyId } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const policies = await upsertPolicyProfile(tenantId, {
      ...body,
      id: policyId,
    });
    return NextResponse.json(policies);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error updating policy:', error);
    return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ policyId: string }> }
) {
  try {
    const { tenantId } = await requireAIAccess('delete');
    const { policyId } = await params;
    const policies = await deletePolicyProfile(tenantId, policyId);
    return NextResponse.json(policies);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error deleting policy:', error);
    return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 });
  }
}
