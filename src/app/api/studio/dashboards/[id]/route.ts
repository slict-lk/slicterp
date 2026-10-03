import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getDashboardById, updateDashboard, deleteDashboard } from '@/apps/studio/dashboard-api';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryCatch(async () => {
  const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const dashboard = await getDashboardById(id, tenant.id);

    if (!dashboard) return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    return NextResponse.json(formatSuccessResponse(dashboard));
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryCatch(async () => {
  const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const body = await req.json();

    const dashboard = await getDashboardById(id, tenant.id);
    if (!dashboard) return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });

    const updatedDashboard = await updateDashboard(id, tenant.id, body);
    return NextResponse.json(formatSuccessResponse(updatedDashboard));
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryCatch(async () => {
  const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();

    const dashboard = await getDashboardById(id, tenant.id);
    if (!dashboard) return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });

    await deleteDashboard(id, tenant.id);
    return NextResponse.json(formatSuccessResponse({ success: true, message: 'Dashboard deleted successfully' }));
  });
}
