jest.mock('@/lib/prisma', () => ({
  prisma: {},
}));

jest.mock('@/apps/crm/api', () => ({
  createActivity: jest.fn(),
  createTask: jest.fn(),
}));

jest.mock('@/apps/spareparts/api', () => ({
  createPurchaseOrder: jest.fn(),
}));

jest.mock('@/apps/studio/api', () => ({
  createCustomRecord: jest.fn(),
}));

jest.mock('@/apps/vehicle-export/api', () => ({
  assignVehiclesToShipment: jest.fn(),
  updateVehicle: jest.fn(),
}));

import { evaluatePolicyDecision, toWorkflowDefinition } from '@/lib/ai/control-plane';

describe('control-plane', () => {
  it('requires approval for high-risk financial actions', () => {
    const decision = evaluatePolicyDecision({
      category: 'financial',
      amount: 15000,
    });

    expect(decision.allow).toBe(true);
    expect(decision.requiresApproval).toBe(true);
    expect(decision.riskScore).toBeGreaterThanOrEqual(82);
    expect(decision.reasonCodes).toContain('financial_control');
  });

  it('keeps low-risk customer communications below the approval threshold', () => {
    const decision = evaluatePolicyDecision({
      category: 'customer_comms',
      batchSize: 5,
    });

    expect(decision.requiresApproval).toBe(false);
    expect(decision.riskScore).toBe(25);
  });

  it('maps studio workflow records into workflow definitions', () => {
    const definition = toWorkflowDefinition({
      id: 'wf-1',
      tenantId: 'tenant-1',
      name: 'Reminder Workflow',
      triggerType: 'record.updated',
      isActive: true,
      triggerConfig: {
        event: 'crm.opportunity.updated',
        filters: { status: 'OPEN' },
        policyProfileId: 'policy-1',
        version: 3,
      },
      nodes: [
        {
          id: 'trigger',
          type: 'triggerNode',
          data: { label: 'crm.opportunity.updated' },
        },
        {
          id: 'step-1',
          type: 'actionNode',
          data: {
            stepKind: 'action',
            config: {
              label: 'Create follow-up task',
              actionType: 'module_action',
            },
          },
        },
      ],
    });

    expect(definition.version).toBe(3);
    expect(definition.trigger.event).toBe('crm.opportunity.updated');
    expect(definition.steps).toHaveLength(1);
    expect(definition.steps[0].config.label).toBe('Create follow-up task');
  });
});
