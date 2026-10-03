import { NextRequest, NextResponse } from 'next/server';
import { createWorkflowDefinition, listWorkflowRegistry } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireAIAccess('view');
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    
    const workflows = await listWorkflowRegistry(tenantId);
    const data = activeOnly ? workflows.filter((workflow) => workflow.status === 'active') : workflows;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, user } = await requireAIAccess('create');
    const data = await request.json();
    
    const workflow = await createWorkflowDefinition(tenantId, user.id, data);
    
    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
