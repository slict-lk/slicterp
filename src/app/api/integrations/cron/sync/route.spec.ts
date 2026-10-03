jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/error-handler', () => ({
  tryCatch: async (fn: () => Promise<unknown>) => fn(),
}));

jest.mock('@/lib/cron-auth', () => ({
  isSessionOrCronAuthorized: jest.fn(),
}));

jest.mock('@/lib/integrations/sync-management', () => ({
  handleIntegrationSyncStatus: jest.fn(),
}));

import { GET } from '@/app/api/integrations/cron/sync/route';
import { isSessionOrCronAuthorized } from '@/lib/cron-auth';
import { handleIntegrationSyncStatus } from '@/lib/integrations/sync-management';

describe('GET /api/integrations/cron/sync', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns 401 and does not execute sync logic when authorization fails', async () => {
    (isSessionOrCronAuthorized as jest.Mock).mockResolvedValueOnce(false);

    const response = await GET({
      headers: {
        get: () => null,
      },
      url: 'http://localhost:3000/api/integrations/cron/sync',
    } as any);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(handleIntegrationSyncStatus).not.toHaveBeenCalled();
  });

  it('reaches the shared sync handler when authorization succeeds', async () => {
    const expectedResponse = {
      status: 200,
      json: async () => ({ ok: true }),
    };

    (isSessionOrCronAuthorized as jest.Mock).mockResolvedValueOnce(true);
    (handleIntegrationSyncStatus as jest.Mock).mockResolvedValueOnce(expectedResponse);

    const response = await GET({
      headers: {
        get: (key: string) => (key === 'authorization' ? 'Bearer expected-secret' : null),
      },
      url: 'http://localhost:3000/api/integrations/cron/sync?integrationId=test-id',
    } as any);

    expect(isSessionOrCronAuthorized).toHaveBeenCalledTimes(1);
    expect(handleIntegrationSyncStatus).toHaveBeenCalledWith('test-id');
    expect(response).toBe(expectedResponse);
  });
});
