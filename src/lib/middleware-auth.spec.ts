import {
  CRON_SYNC_PATH,
  isProxyAuthorizedPath,
  isProxySessionExemptPath,
} from '@/lib/middleware-auth';

describe('proxy auth path rules', () => {
  it('allows only the exact cron sync path through without a session token', () => {
    expect(isProxySessionExemptPath(CRON_SYNC_PATH)).toBe(true);
    expect(isProxyAuthorizedPath(CRON_SYNC_PATH, null)).toBe(true);
  });

  it('does not exempt similar integrations paths', () => {
    expect(isProxySessionExemptPath('/api/integrations/sync')).toBe(false);
    expect(isProxyAuthorizedPath('/api/integrations/sync', null)).toBe(false);
    expect(isProxyAuthorizedPath('/api/integrations/sync', { sub: 'user-1' })).toBe(true);
  });

  it('does not exempt arbitrary cron-like paths', () => {
    expect(isProxySessionExemptPath('/api/cron/intelligence')).toBe(false);
    expect(isProxySessionExemptPath('/api/integrations/cron/sync/extra')).toBe(false);
    expect(isProxyAuthorizedPath('/api/cron/intelligence', null)).toBe(false);
  });
});
