import { NextResponse } from 'next/server';
import { processAllTenantAutomationQueues, getTenantAIConfig } from '@/lib/ai/control-plane';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 404 });

    // 1. Process Queues
    console.log('[Test Trigger] Manually processing AI queues...');
    const result = await processAllTenantAutomationQueues();
    
    // 2. Get Pending Approvals
    const config = await getTenantAIConfig(tenant.id);
    
    return NextResponse.json({ 
      processed: result,
      pendingApprovals: config.pendingApprovals,
      executionQueueSize: config.executionQueue.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
