import {
  DEFAULT_INTELLIGENCE_SETTINGS,
  normalizeIntelligenceSettings,
} from '@/lib/intelligence/settings/intelligence-settings-service';

describe('intelligence-settings-service', () => {
  it('normalizes governance state including archived recommendations', () => {
    const settings = normalizeIntelligenceSettings({
      recommendationStatusById: {
        rec1: 'ARCHIVED',
      },
      recommendationGovernanceById: {
        rec1: {
          status: 'ARCHIVED',
          note: 'Closed after leadership review.',
          reviewedAt: '2026-06-06T10:00:00.000Z',
          reviewedByUserId: 'user-1',
        },
      },
    });

    expect(settings.recommendationStatusById.rec1).toBe('ARCHIVED');
    expect(settings.recommendationGovernanceById.rec1).toEqual({
      status: 'ARCHIVED',
      note: 'Closed after leadership review.',
      reviewedAt: '2026-06-06T10:00:00.000Z',
      reviewedByUserId: 'user-1',
    });
  });

  it('falls back to defaults for malformed governance values', () => {
    const settings = normalizeIntelligenceSettings({
      readinessThreshold: 999,
      recommendationGovernanceById: {
        bad: {
          status: 'NOT_A_STATUS',
        },
      },
    });

    expect(settings.readinessThreshold).toBe(100);
    expect(settings.recommendationGovernanceById).toEqual({});
    expect(settings.requireHumanReview).toBe(DEFAULT_INTELLIGENCE_SETTINGS.requireHumanReview);
  });
});
