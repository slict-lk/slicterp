import { isCronBearerAuthorized } from '@/lib/cron-bearer-auth';

describe('isCronBearerAuthorized', () => {
  it('returns false when the authorization header is missing', () => {
    expect(isCronBearerAuthorized(null, 'expected-secret')).toBe(false);
  });

  it('returns false for a non-bearer authorization scheme', () => {
    expect(isCronBearerAuthorized('Basic expected-secret', 'expected-secret')).toBe(false);
  });

  it('returns false for an incorrect bearer secret', () => {
    expect(isCronBearerAuthorized('Bearer wrong-secret', 'expected-secret')).toBe(false);
  });

  it('returns true for the correct bearer secret', () => {
    expect(isCronBearerAuthorized('Bearer expected-secret', 'expected-secret')).toBe(true);
  });

  it('returns false when the cron secret is empty or missing', () => {
    expect(isCronBearerAuthorized('Bearer expected-secret', '')).toBe(false);
    expect(isCronBearerAuthorized('Bearer expected-secret', undefined)).toBe(false);
  });
});
