import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { prisma } from '../src/lib/prisma';
import { publishDomainEvent } from '../src/lib/ai/control-plane';

async function main() {
  console.log('🚀 AI Workflow Test Trigger Started');

  // 1. Get the primary tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error('❌ No tenant found in the database.');
    return;
  }
  console.log(`✅ Using Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Mock some data (find a customer first)
  const customer = await prisma.customer.findFirst({
    where: { tenantId: tenant.id }
  });
  
  if (!customer) {
    console.warn('⚠️ No customer found. Creating a phantom customer for the event...');
  }

  const customerId = customer?.id || 'phantom-customer-id';
  const customerName = customer?.name || 'BlueWave Logistics';

  // --- TRIGER 1: CRM Opportunity Created ---
  console.log('\n--- Triggering Workflow: Create Follow-up Task ---');
  await publishDomainEvent({
    id: `evt-crm-opp-${Date.now()}`,
    tenantId: tenant.id,
    module: 'crm',
    entity: 'opportunity',
    event: 'created',
    occurredAt: new Date().toISOString(),
    actorType: 'user',
    actorId: 'system-test-bot',
    payload: {
      opportunityId: `opp-${Date.now()}`,
      name: `High Value Deal with ${customerName}`,
      amount: 50000,
      currency: 'LKR',
      customerId: customerId,
      customerName: customerName,
      status: 'PROSPECTING'
    }
  });
  console.log('✅ Published crm.opportunity.created');

  // --- TRIGGER 2: Accounting Invoice Created ---
  console.log('\n--- Triggering Workflow: CRM - Follow up with a customer ---');
  await publishDomainEvent({
    id: `evt-acc-inv-${Date.now()}`,
    tenantId: tenant.id,
    module: 'accounting',
    entity: 'invoice',
    event: 'created',
    occurredAt: new Date().toISOString(),
    actorType: 'user',
    actorId: 'system-test-bot',
    payload: {
      invoiceId: `inv-${Date.now()}`,
      number: `INV-2026-${Math.floor(Math.random() * 1000)}`,
      total: 12500,
      amountDue: 12500,
      customerId: customerId,
      customerName: customerName,
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    }
  });
  console.log('✅ Published accounting.invoice.created');

  console.log('\n🎉 All test events published. Check the AI Audit log (/ai/audit) for execution results!');
}

main()
  .catch(err => {
    console.error('❌ Test script failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
