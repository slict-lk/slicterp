export const CRON_SYNC_PATH = '/api/integrations/cron/sync';

export function isProxySessionExemptPath(pathname: string) {
  return (
    pathname === CRON_SYNC_PATH ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/vehicle-export/requests')
  );
}

export function isProxyAuthorizedPath(
  pathname: string,
  token: unknown
) {
  return isProxySessionExemptPath(pathname) || Boolean(token);
}
