jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { GET } from '@/app/api/health/route';
import { prisma } from '@/lib/prisma';

describe('GET /api/health', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns only the minimal healthy payload on success', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([1]);

    const response = await GET();
    const body = await response.json();
    const text = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'ok' });
    expect(text).not.toContain('DATABASE_URL');
    expect(text).not.toContain('NEXTAUTH_SECRET');
    expect(text).not.toContain('stack');
    expect(text).not.toContain('host');
  });

  it('returns only the minimal unhealthy payload on failure', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(
      new Error('Database connection failed for host db.internal with DATABASE_URL')
    );

    const response = await GET();
    const body = await response.json();
    const text = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(body).toEqual({ status: 'unhealthy' });
    expect(text).not.toContain('DATABASE_URL');
    expect(text).not.toContain('Database connection failed');
    expect(text).not.toContain('db.internal');
    expect(text).not.toContain('stack');
    expect(text).not.toContain('host');
  });
});
