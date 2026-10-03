import type {
  ActionAdapterUIMetadata,
  ActionFieldSchema,
  DomainModule,
  EventCatalogItem,
  WorkflowDefinition,
} from '@/lib/ai/control-plane-types';

const MODULE_LABELS: Record<DomainModule, string> = {
  crm: 'CRM',
  accounting: 'Accounting',
  spareparts: 'Spare Parts',
  'real-estate': 'Real Estate',
  restaurant: 'Restaurant',
  'vehicle-export': 'Vehicle Export',
  hr: 'HR',
  projects: 'Projects',
  studio: 'Studio',
};

const EVENT_CATALOG: EventCatalogItem[] = [
  {
    id: 'manual.crm.followup',
    module: 'crm',
    entity: 'workflow',
    event: 'manual.crm.followup',
    label: 'When I want to create a CRM follow-up task manually',
    description: 'Use this to test or publish a follow-up automation without waiting for another business event.',
    category: 'manual',
  },
  {
    id: 'crm.opportunity.created',
    module: 'crm',
    entity: 'opportunity',
    event: 'crm.opportunity.created',
    label: 'When a CRM opportunity is created',
    description: 'Good for creating follow-ups, reviews, and outreach drafts as soon as a new deal enters the pipeline.',
    category: 'sales',
  },
  {
    id: 'manual.accounting.adjustment',
    module: 'accounting',
    entity: 'journal-entry',
    event: 'manual.accounting.adjustment',
    label: 'When finance needs a manual adjustment workflow',
    description: 'Use this for governed adjustment and approval testing.',
    category: 'finance',
  },
  {
    id: 'accounting.invoice.created',
    module: 'accounting',
    entity: 'invoice',
    event: 'accounting.invoice.created',
    label: 'When an accounting invoice is created',
    description: 'Useful for reminder, review, and collections automations.',
    category: 'finance',
  },
  {
    id: 'spareparts.purchase-order.created',
    module: 'spareparts',
    entity: 'purchase-order',
    event: 'spareparts.purchase-order.created',
    label: 'When a spare parts purchase order is created',
    description: 'Useful for operational follow-ups and supplier workflows.',
    category: 'inventory',
  },
  {
    id: 'real-estate.property.created',
    module: 'real-estate',
    entity: 'property',
    event: 'real-estate.property.created',
    label: 'When a property record is created',
    description: 'Good for viewing coordination and client follow-up.',
    category: 'property',
  },
  {
    id: 'restaurant.shift.clocked_in',
    module: 'restaurant',
    entity: 'shift',
    event: 'restaurant.shift.clocked_in',
    label: 'When a restaurant shift starts',
    description: 'Useful for team reminders and shift briefings.',
    category: 'operations',
  },
  {
    id: 'vehicle-export.shipment.created',
    module: 'vehicle-export',
    entity: 'shipment',
    event: 'vehicle-export.shipment.created',
    label: 'When a vehicle export shipment is created',
    description: 'Useful for dispatch coordination and milestone updates.',
    category: 'logistics',
  },
  {
    id: 'manual.studio.create_record',
    module: 'studio',
    entity: 'record',
    event: 'manual.studio.create_record',
    label: 'When I want to create a Studio record manually',
    description: 'Use this for custom-module automation tests.',
    category: 'manual',
  },
];

function f(
  key: string,
  label: string,
  description: string,
  type: ActionFieldSchema['type'],
  extras: Partial<ActionFieldSchema> = {}
): ActionFieldSchema {
  return { key, label, description, type, ...extras };
}

const ACTION_UI: ActionAdapterUIMetadata[] = [
  {
    module: 'crm',
    action: 'follow_up_task',
    label: 'Create Follow-up Task',
    shortDescription: 'Create a sales or service follow-up task for the team.',
    category: 'Customer follow-up',
    icon: 'check-square',
    successLabel: 'Follow-up task ready',
    summaryTemplate: 'When {trigger}, create a {priority} follow-up task for {title}.',
    fields: [
      f('title', 'Task title', 'What should the team do next?', 'text', { required: true, placeholder: 'Call BlueWave about renewal proposal' }),
      f('description', 'Task details', 'Add the context the assignee should see.', 'textarea', { rows: 3 }),
      f('priority', 'Priority', 'How urgent is this task?', 'select', {
        options: [
          { label: 'Low', value: 'LOW' },
          { label: 'Medium', value: 'MEDIUM' },
          { label: 'High', value: 'HIGH' },
        ],
      }),
      f('leadId', 'Lead ID', 'Optional lead record to link.', 'text'),
      f('opportunityId', 'Opportunity ID', 'Optional opportunity to link.', 'text'),
      f('accountId', 'Account ID', 'Optional account to link.', 'text'),
      f('dueAt', 'Due date', 'When should the task be completed?', 'datetime'),
      f('assignedToUserId', 'Assign to user', 'Optional assignee user ID.', 'text'),
    ],
  },
  {
    module: 'crm',
    action: 'email_draft',
    label: 'Draft Customer Email',
    shortDescription: 'Prepare an outreach email draft for review.',
    category: 'Customer communication',
    icon: 'mail',
    successLabel: 'Email draft ready',
    summaryTemplate: 'When {trigger}, draft an email with subject "{subject}".',
    fields: [
      f('subject', 'Email subject', 'What subject should the draft use?', 'text', { required: true }),
      f('body', 'Email body', 'Write the message draft or talking points.', 'textarea', { rows: 5 }),
      f('recipientEmail', 'Recipient email', 'Who should receive this draft?', 'email'),
      f('leadId', 'Lead ID', 'Optional lead record to link.', 'text'),
      f('opportunityId', 'Opportunity ID', 'Optional opportunity to link.', 'text'),
      f('accountId', 'Account ID', 'Optional account to link.', 'text'),
      f('dueAt', 'Due date', 'Optional review deadline.', 'datetime'),
    ],
  },
  {
    module: 'accounting',
    action: 'write_off',
    label: 'Create Write-off Entry',
    shortDescription: 'Post a balanced write-off journal entry after review.',
    category: 'Finance control',
    icon: 'receipt',
    successLabel: 'Write-off entry posted',
    summaryTemplate: 'When {trigger}, prepare a write-off for reference {reference}.',
    fields: [
      f('reference', 'Reference', 'Reference shown on the journal entry.', 'text', { placeholder: 'AI-WO-001' }),
      f('description', 'Description', 'Business reason for the write-off.', 'textarea', { rows: 3 }),
      f('entryDate', 'Entry date', 'Posting date for the entry.', 'date'),
      f('debitAccountCode', 'Debit account code', 'Account code for the debit line.', 'text', { required: true }),
      f('creditAccountCode', 'Credit account code', 'Account code for the credit line.', 'text', { required: true }),
      f('amount', 'Amount', 'Balanced amount to post.', 'number', { required: true }),
      f('invoiceId', 'Invoice ID', 'Optional source invoice ID.', 'text'),
    ],
  },
  {
    module: 'accounting',
    action: 'adjustment',
    label: 'Create Adjustment Entry',
    shortDescription: 'Post a balanced adjustment journal entry after review.',
    category: 'Finance control',
    icon: 'scale',
    successLabel: 'Adjustment entry posted',
    summaryTemplate: 'When {trigger}, prepare an adjustment for reference {reference}.',
    fields: [
      f('reference', 'Reference', 'Reference shown on the journal entry.', 'text', { placeholder: 'AI-ADJ-001' }),
      f('description', 'Description', 'Business reason for the adjustment.', 'textarea', { rows: 3 }),
      f('entryDate', 'Entry date', 'Posting date for the entry.', 'date'),
      f('debitAccountCode', 'Debit account code', 'Account code for the debit line.', 'text', { required: true }),
      f('creditAccountCode', 'Credit account code', 'Account code for the credit line.', 'text', { required: true }),
      f('amount', 'Amount', 'Balanced amount to post.', 'number', { required: true }),
      f('invoiceId', 'Invoice ID', 'Optional source invoice ID.', 'text'),
    ],
  },
  {
    module: 'spareparts',
    action: 'reorder_proposal',
    label: 'Create Reorder Proposal',
    shortDescription: 'Create a purchase order proposal for spare parts replenishment.',
    category: 'Inventory replenishment',
    icon: 'package',
    successLabel: 'Reorder proposal created',
    summaryTemplate: 'When {trigger}, create a reorder proposal for supplier {supplierId}.',
    fields: [
      f('supplierId', 'Supplier ID', 'Which supplier should receive the proposal?', 'text', { required: true }),
      f('expectedDate', 'Expected date', 'Expected arrival date.', 'date'),
      f('notes', 'Notes', 'Operator notes for the supplier or purchasing team.', 'textarea', { rows: 3 }),
      f('isTaxEnabled', 'Tax enabled', 'Include tax on this proposal.', 'boolean'),
      f('items', 'Items', 'One item per line as productId,quantity,unitCost', 'list', {
        required: true,
        placeholder: 'product-1,40,42.5',
      }),
    ],
  },
  {
    module: 'real-estate',
    action: 'schedule_viewing',
    label: 'Schedule Property Viewing',
    shortDescription: 'Book a property viewing for a client.',
    category: 'Client scheduling',
    icon: 'calendar',
    successLabel: 'Viewing scheduled',
    summaryTemplate: 'When {trigger}, schedule a viewing for {clientName}.',
    fields: [
      f('propertyId', 'Property ID', 'Which property should be shown?', 'text', { required: true }),
      f('clientName', 'Client name', 'Who is attending the viewing?', 'text', { required: true }),
      f('clientEmail', 'Client email', 'Where should updates be sent?', 'email', { required: true }),
      f('clientPhone', 'Client phone', 'Optional phone number.', 'text'),
      f('scheduledAt', 'Viewing time', 'When should the viewing happen?', 'datetime', { required: true }),
      f('notes', 'Notes', 'Any special instructions for the viewing.', 'textarea', { rows: 3 }),
    ],
  },
  {
    module: 'restaurant',
    action: 'shift_nudge',
    label: 'Send Shift Reminder',
    shortDescription: 'Add an operational reminder for the shift team.',
    category: 'Operations reminder',
    icon: 'bell',
    successLabel: 'Shift reminder saved',
    summaryTemplate: 'When {trigger}, send a shift reminder to the {audience} team.',
    fields: [
      f('text', 'Reminder text', 'What should the team pay attention to?', 'textarea', { required: true, rows: 3 }),
      f('audience', 'Audience', 'Who is the reminder for?', 'select', {
        options: [
          { label: 'Staff', value: 'staff' },
          { label: 'Kitchen', value: 'kitchen' },
          { label: 'Front of House', value: 'front_of_house' },
        ],
      }),
    ],
  },
  {
    module: 'vehicle-export',
    action: 'dispatch_update',
    label: 'Update Dispatch Status',
    shortDescription: 'Update shipment or vehicle dispatch state.',
    category: 'Logistics update',
    icon: 'truck',
    successLabel: 'Dispatch status updated',
    summaryTemplate: 'When {trigger}, update shipment {shipmentId} to {shipmentStatus}.',
    fields: [
      f('shipmentId', 'Shipment ID', 'Shipment to update.', 'text'),
      f('shipmentStatus', 'Shipment status', 'New shipment status.', 'select', {
        options: [
          { label: 'Booked', value: 'BOOKED' },
          { label: 'Sailed', value: 'SAILED' },
          { label: 'Arrived', value: 'ARRIVED' },
        ],
      }),
      f('vehicleId', 'Vehicle ID', 'Optional vehicle to update.', 'text'),
      f('vehicleStatus', 'Vehicle status', 'Optional vehicle status.', 'text'),
      f('vehicleIds', 'Vehicle IDs', 'Optional list of vehicle IDs, one per line.', 'list'),
    ],
  },
  {
    module: 'studio',
    action: 'create_record',
    label: 'Create Studio Record',
    shortDescription: 'Create a custom record in a Studio module.',
    category: 'Custom module action',
    icon: 'database',
    successLabel: 'Studio record created',
    summaryTemplate: 'When {trigger}, create a record in module {moduleId}.',
    fields: [
      f('moduleId', 'Studio module ID', 'Which Studio module should receive the new record?', 'text', { required: true }),
      f('recordTitle', 'Record title', 'A simple title field for the sample record data.', 'text'),
      f('recordStatus', 'Record status', 'A simple status field for the sample record data.', 'text'),
    ],
  },
];

export function getModuleLabel(module: string) {
  return MODULE_LABELS[module as DomainModule] || module;
}

export function listEventCatalog(module?: DomainModule) {
  return module ? EVENT_CATALOG.filter((item) => item.module === module) : EVENT_CATALOG;
}

export function getEventCatalogItem(event: string) {
  return EVENT_CATALOG.find((item) => item.event === event || item.id === event) || null;
}

export function listActionUIMetadata(module?: DomainModule) {
  return module ? ACTION_UI.filter((item) => item.module === module) : ACTION_UI;
}

export function getActionUIMetadata(module: DomainModule, action: string) {
  return ACTION_UI.find((item) => item.module === module && item.action === action) || null;
}

export function buildActionPayloadFromSimpleForm(
  module: DomainModule,
  action: string,
  values: Record<string, string | boolean>
) {
  if (module === 'accounting' && (action === 'write_off' || action === 'adjustment')) {
    const amount = Number(values.amount || 0);
    return {
      reference: String(values.reference || ''),
      description: String(values.description || ''),
      entryDate: String(values.entryDate || ''),
      invoiceId: String(values.invoiceId || ''),
      lines: [
        {
          accountCode: String(values.debitAccountCode || ''),
          description: 'Debit',
          debit: amount,
          credit: 0,
        },
        {
          accountCode: String(values.creditAccountCode || ''),
          description: 'Credit',
          debit: 0,
          credit: amount,
        },
      ],
    };
  }

  if (module === 'spareparts' && action === 'reorder_proposal') {
    const items = String(values.items || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [productId, quantity, unitCost] = line.split(',').map((part) => part.trim());
        return {
          productId,
          quantity: Number(quantity || 0),
          unitCost: Number(unitCost || 0),
        };
      });

    return {
      supplierId: String(values.supplierId || ''),
      expectedDate: String(values.expectedDate || ''),
      notes: String(values.notes || ''),
      isTaxEnabled: values.isTaxEnabled === true || String(values.isTaxEnabled) === 'true',
      items,
    };
  }

  if (module === 'vehicle-export' && action === 'dispatch_update') {
    return {
      shipmentId: String(values.shipmentId || ''),
      shipmentStatus: String(values.shipmentStatus || ''),
      vehicleId: String(values.vehicleId || ''),
      vehicleStatus: String(values.vehicleStatus || ''),
      vehicleIds: String(values.vehicleIds || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    };
  }

  if (module === 'studio' && action === 'create_record') {
    return {
      moduleId: String(values.moduleId || ''),
      data: {
        title: String(values.recordTitle || ''),
        status: String(values.recordStatus || ''),
      },
    };
  }

  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'boolean') {
      payload[key] = value;
      continue;
    }
    if (value !== '') {
      payload[key] = value;
    }
  }
  return payload;
}

export function summarizeWorkflow(
  definition: Pick<WorkflowDefinition, 'trigger' | 'steps'>,
  moduleScope: DomainModule
) {
  const triggerLabel = getEventCatalogItem(definition.trigger.event)?.label || definition.trigger.event;
  const firstAction = definition.steps.find((step) => step.kind === 'action');
  const config = (firstAction?.config || {}) as Record<string, unknown>;
  const actionMeta = getActionUIMetadata(
    (String(config.module || config.moduleId || moduleScope) as DomainModule),
    String(config.action || config.actionId || '')
  );

  if (!firstAction || !actionMeta) {
    return `When ${triggerLabel.toLowerCase()}, run this automation.`;
  }

  const payload = (config.payload || config.data || {}) as Record<string, unknown>;
  return actionMeta.summaryTemplate.replace(/\{(\w+)\}/g, (_, key) => {
    if (key === 'trigger') return triggerLabel.toLowerCase();
    return String(payload[key] || 'the selected record');
  });
}
