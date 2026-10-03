import { NextRequest, NextResponse } from 'next/server';
import { listWorkflowTemplates, upsertWorkflowTemplate } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { tenantId } = await requireAIAccess('view');
    const templates = await listWorkflowTemplates(tenantId);
    return NextResponse.json(templates);
  } catch (error: any) {
    const errStatus = error instanceof Response ? error.status : error?.status;
    if (errStatus === 401 || errStatus === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: errStatus });
    }
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a plain object' }, { status: 400 });
    }
    const templates = await upsertWorkflowTemplate(tenantId, body);
    return NextResponse.json(templates);
  } catch (error: any) {
    const errStatus = error instanceof Response ? error.status : error?.status;
    if (errStatus === 401 || errStatus === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: errStatus });
    }
    console.error('Error saving template:', error);
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }
}
