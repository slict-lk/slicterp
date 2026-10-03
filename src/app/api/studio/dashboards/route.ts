import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getDashboards, createDashboard } from '@/apps/studio/dashboard-api';

export async function GET(req: Request) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const { searchParams } = new URL(req.url);

    const rawSkip = parseInt(searchParams.get('skip') || '0', 10);
    const rawTake = parseInt(searchParams.get('take') || '50', 10);
    const skip = Number.isFinite(rawSkip) ? Math.max(0, Math.floor(rawSkip)) : 0;
    const take = Number.isFinite(rawTake) ? Math.min(100, Math.max(1, Math.floor(rawTake))) : 50;
    const search = searchParams.get('search') || undefined;
    const isPublished = searchParams.has('isPublished') ? searchParams.get('isPublished') === 'true' : undefined;

    const result = await getDashboards(tenant.id, { skip, take, search, isPublished });
    const resp = formatSuccessResponse(result.data);
    return NextResponse.json({ ...resp, meta: { count: result.count, skip: result.skip, take: result.take } });
  });
}

export async function POST(req: Request) {
  return tryCatch(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const body = await req.json();

    if (!body.name || !body.layout) {
      return NextResponse.json({ error: 'Dashboard name and layout are required' }, { status: 400 });
    }

    const dashboard = await createDashboard(tenant.id, body, session.user.id);
    return NextResponse.json(formatSuccessResponse(dashboard), { status: 201 });
  });
}
