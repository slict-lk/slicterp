import { NextRequest, NextResponse } from 'next/server';
import { takeApprovalAction } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  try {
    const { tenantId, user } = await requireAIAccess('approve');
    const { approvalId } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const validDecisions = ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'ESCALATED'];
    if (!body.decision || !validDecisions.includes(body.decision)) {
      return NextResponse.json({ error: `decision must be one of: ${validDecisions.join(', ')}` }, { status: 400 });
    }
    if (body.note !== undefined && typeof body.note !== 'string') {
      return NextResponse.json({ error: 'note must be a string' }, { status: 400 });
    }

    const updated = await takeApprovalAction({
      tenantId,
      approvalId,
      actorId: user.id,
      decision: body.decision,
      note: body.note,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Approval item not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error updating approval:', error);
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 });
  }
}
