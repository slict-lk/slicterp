import { NextRequest, NextResponse } from 'next/server';
import { listIntegrationConfigs, upsertIntegrationConfig } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

function handleAuthError(error: any): NextResponse | null {
  const status = error instanceof Response ? error.status : error?.status;
  if (status === 401 || status === 403) {
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  return null;
}

export async function GET() {
  try {
    const { tenantId } = await requireAIAccess('view');
    const integrations = await listIntegrationConfigs(tenantId);
    return NextResponse.json(integrations);
  } catch (error: any) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Error fetching integrations:', error);
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireAIAccess('create');
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
    }
    const integrations = await upsertIntegrationConfig(tenantId, body);
    return NextResponse.json(integrations);
  } catch (error: any) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Error saving integration:', error);
    return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 });
  }
}
