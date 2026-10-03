import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getDashboardWidgets, createDashboardWidget, getDashboardById } from '@/apps/studio/dashboard-api';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryCatch(async () => {
  const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();

    const dashboard = await getDashboardById(id, tenant.id);
    if (!dashboard) return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });

    const widgets = await getDashboardWidgets(id);
    return NextResponse.json(formatSuccessResponse(widgets));
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryCatch(async () => {
  const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const body = await req.json();

    if (!body.title || !body.type || !body.dataSource || !body.config || !body.position) {
      return NextResponse.json({ error: 'Missing required widget properties' }, { status: 400 });
    }

    const dashboard = await getDashboardById(id, tenant.id);
    if (!dashboard) return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });

    const sanitizedBody = {
      title: body.title,
      type: body.type,
      dataSource: body.dataSource,
      config: body.config,
      position: body.position,
      metrics: body.metrics,
    };
    const widget = await createDashboardWidget(id, sanitizedBody);
    return NextResponse.json(formatSuccessResponse(widget), { status: 201 });
  });
}
