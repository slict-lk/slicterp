import { NextResponse } from 'next/server';
import { generateAuditEvidenceBundle } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { tenantId } = await requireAIAccess('view');
    const bundle = await generateAuditEvidenceBundle(tenantId);

    // Sanitize tenantId for Content-Disposition header
    const sanitizedTenantId = (tenantId || '').replace(/[^A-Za-z0-9_-]/g, '') || 'unknown-tenant';

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ai-audit-bundle-${sanitizedTenantId}.json"`,
      },
    });
  } catch (error) {
    console.error('Error generating audit bundle:', error);
    return NextResponse.json({ error: 'Failed to generate audit bundle' }, { status: 500 });
  }
}
