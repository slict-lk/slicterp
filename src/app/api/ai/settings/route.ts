import { NextRequest, NextResponse } from 'next/server';
import {
  createTestAIAlert,
  getAISettings,
  restoreDefaultAISettings,
  upsertAISettings,
} from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { tenantId } = await requireAIAccess('view');
    const settings = await getAISettings(tenantId);
    return NextResponse.json(settings);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error fetching AI settings:', error);
    return NextResponse.json({ error: 'Failed to fetch AI settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId } = await requireAIAccess('edit');
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
    }
    const config = await upsertAISettings(tenantId, body);
    return NextResponse.json(config);
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error updating AI settings:', error);
    return NextResponse.json({ error: 'Failed to update AI settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (body.action === 'restore_defaults') {
      const { tenantId } = await requireAIAccess('edit');
      const settings = await restoreDefaultAISettings(tenantId);
      return NextResponse.json(settings);
    }

    if (body.action === 'send_test_alert') {
      const { tenantId, user } = await requireAIAccess('edit');
      const insight = await createTestAIAlert(tenantId, user.id);
      return NextResponse.json(insight, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported settings action' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof Response || error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error?.status || 403 });
    }
    console.error('Error executing AI settings action:', error);
    return NextResponse.json({ error: 'Failed to execute AI settings action' }, { status: 500 });
  }
}
