import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishDomainEvent } from '@/lib/ai/control-plane';

export async function GET(request: NextRequest) {
  try {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    const customer = await prisma.customer.findFirst({
      where: { tenantId: tenant.id }
    });
    
    const customerId = customer?.id || 'test-customer-id';
    const customerName = customer?.name || 'BlueWave Logistics';

    console.log(`[Test Trigger] Manually firing events for tenant: ${tenant.name}`);

    // 1. Trigger CRM Opportunity
    const correlationId = `test-corr-${Date.now()}`;
    
    await publishDomainEvent({
      id: `test-opp-${Date.now()}`,
      tenantId: tenant.id,
      module: 'crm',
      entity: 'opportunity',
      event: 'created',
      occurredAt: new Date().toISOString(),
      actorType: 'user',
      actorId: 'test-admin',
      correlationId,
      payload: {
        opportunityId: `opp-${Date.now()}`,
        name: `High Value Deal with ${customerName}`,
        amount: 500000, // Increased to 500k to force approval
        currency: 'LKR',
        customerId: customerId,
        customerName: customerName,
        status: 'PROSPECTING'
      }
    });

    // 2. Trigger Accounting Invoice
    await publishDomainEvent({
      id: `test-inv-${Date.now()}`,
      tenantId: tenant.id,
      module: 'accounting',
      entity: 'invoice',
      event: 'created',
      occurredAt: new Date().toISOString(),
      actorType: 'user',
      actorId: 'test-admin',
      correlationId: `${correlationId}-inv`,
      payload: {
        invoiceId: `inv-${Date.now()}`,
        number: `INV-2026-${Math.floor(Math.random() * 1000)}`,
        total: 125000, // Increased to 125k to force approval
        amountDue: 125000,
        customerId: customerId,
        customerName: customerName,
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Test events published successfully!',
      triggers: ['crm.opportunity.created', 'accounting.invoice.created'],
      tenant: tenant.name
    });

  } catch (error: any) {
    console.error('[Test Trigger Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
