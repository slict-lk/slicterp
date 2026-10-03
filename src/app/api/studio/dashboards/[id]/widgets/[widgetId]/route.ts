import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { updateDashboardWidget, deleteDashboardWidget, getDashboardById } from '@/apps/studio/dashboard-api';

export async function PUT(req: Request, ctx: { params: Promise<{ id: string; widgetId: string }> }) {
  return tryCatch(async () => {
  const { id, widgetId } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const body = await req.json();

    const dashboard = await getDashboardById(id, tenant.id);
    if (!dashboard) return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });

    // Verify widget belongs to this dashboard
    const existingWidget = dashboard.widgets?.find((w: any) => w.id === widgetId);
    if (!existingWidget) return NextResponse.json({ error: 'Widget not found in this dashboard' }, { status: 404 });

    const sanitizedWidget = {
      title: body.title,
      type: body.type,
      dataSource: body.dataSource,
      config: body.config,
      position: body.position,
      metrics: body.metrics,
    };
    const widget = await updateDashboardWidget(widgetId, sanitizedWidget);
    return NextResponse.json(formatSuccessResponse(widget));
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; widgetId: string }> }) {
  return tryCatch(async () => {
  const { id, widgetId } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();

    const dashboard = await getDashboardById(id, tenant.id);
    if (!dashboard) return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });

    // Verify widget belongs to this dashboard
    const existingWidget = dashboard.widgets?.find((w: any) => w.id === widgetId);
    if (!existingWidget) return NextResponse.json({ error: 'Widget not found in this dashboard' }, { status: 404 });

    await deleteDashboardWidget(widgetId);
    return NextResponse.json(formatSuccessResponse({ success: true, message: 'Widget deleted successfully' }));
  });
}
