import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getCustomModuleById, updateCustomModule, deleteCustomModule } from '@/apps/studio/api';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
    return tryCatch(async () => {
  const { id } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();
        const module = await getCustomModuleById(tenant.id, id);

        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        return NextResponse.json(formatSuccessResponse(module));
    });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
    return tryCatch(async () => {
  const { id } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();
        const body = await req.json();

        const module = await getCustomModuleById(tenant.id, id);
        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        await updateCustomModule(id, tenant.id, body);

        const updatedModule = await getCustomModuleById(tenant.id, id);
        return NextResponse.json(formatSuccessResponse(updatedModule));
    });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
    return tryCatch(async () => {
  const { id } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();

        const module = await getCustomModuleById(tenant.id, id);
        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        await deleteCustomModule(id, tenant.id);

        return NextResponse.json(formatSuccessResponse({ success: true, message: 'Module deleted successfully' }));
    });
}
