import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth-config';
import { isCronBearerAuthorized } from '@/lib/cron-bearer-auth';

export async function isSessionOrCronAuthorized(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  return isCronBearerAuthorized(authHeader, cronSecret);
}
