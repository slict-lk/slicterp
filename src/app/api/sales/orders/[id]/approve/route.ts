import { NextRequest, NextResponse } from 'next/server';
import { approveSalesOrderV2 } from '@/apps/sales/canonical-api';
import { requireTenantContext } from '@/lib/server/erp-context';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const approveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  reason: z.string().optional(),
  ruleCode: z.string().optional(),
  markOrderStatus: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'sales', action: 'approve' });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const validatedBody = approveSchema.parse(body);
    const result = await approveSalesOrderV2(tenantId, id, user.id, validatedBody);

    return NextResponse.json({ data: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    const message = String(error?.message || '');
    const status = message.includes('Forbidden')
      ? 403
      : /invalid|approval|not found/i.test(message)
        ? 400
        : 500;
    return NextResponse.json(
      { error: status === 403 ? 'Forbidden' : status === 500 ? 'Failed to approve order' : message || 'Invalid request' },
      { status }
    );
  }
}
