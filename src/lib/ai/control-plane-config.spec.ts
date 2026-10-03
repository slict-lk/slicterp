import {
  buildDefaultSettings,
  buildDefaultTenantConfig,
  mergeTenantAIConfig,
} from '@/lib/ai/control-plane-config';

describe('control-plane-config', () => {
  it('builds queue and escalation defaults', () => {
    const settings = buildDefaultSettings();

    expect(settings.defaultApproverChain).toEqual(['AI_ADMIN', 'APPROVER']);
    expect(settings.maxExecutionAttempts).toBe(3);
    expect(settings.retryBackoffMinutes).toBe(10);
    expect(settings.escalationSlaMinutes).toBe(120);
  });

  it('builds an empty tenant config with runtime collections', () => {
    const config = buildDefaultTenantConfig('tenant-1');

    expect(config.pendingApprovals).toEqual([]);
    expect(config.executionQueue).toEqual([]);
    expect(config.deadLetterQueue).toEqual([]);
    expect(config.workflowVersions).toEqual([]);
  });

  it('merges tenant overrides without dropping existing defaults', () => {
    const base = buildDefaultTenantConfig('tenant-1');
    const merged = mergeTenantAIConfig(base, {
      settings: {
        retentionDays: 365,
        diagnosticsEnabled: false,
      },
      executionQueue: [
        {
          id: 'queue-1',
          workflowId: 'wf-1',
          tenantId: 'tenant-1',
          correlationId: 'corr-1',
          idempotencyKey: 'idem-1',
          status: 'queued',
          source: 'manual',
          requestedBy: 'user-1',
          triggerData: {},
          scheduledFor: new Date().toISOString(),
          attemptCount: 0,
          maxAttempts: 3,
          failureHistory: [],
        },
      ],
    });

    expect(merged.settings.retentionDays).toBe(365);
    expect(merged.settings.diagnosticsEnabled).toBe(false);
    expect(merged.settings.defaultApproverChain).toEqual(['AI_ADMIN', 'APPROVER']);
    expect(merged.executionQueue).toHaveLength(1);
  });
});
