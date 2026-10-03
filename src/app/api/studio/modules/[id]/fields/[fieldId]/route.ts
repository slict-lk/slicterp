import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { updateCustomModuleField, deleteCustomModuleField, getCustomModuleById } from '@/apps/studio/api';

export async function PUT(req: Request, ctx: { params: Promise<{ id: string; fieldId: string }> }) {
    return tryCatch(async () => {
  const { id, fieldId } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();
        const body = await req.json();

        const module = await getCustomModuleById(tenant.id, id);
        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        const field = await updateCustomModuleField(fieldId, body);
        return NextResponse.json(formatSuccessResponse(field));
    });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; fieldId: string }> }) {
    return tryCatch(async () => {
  const { id, fieldId } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();

        const module = await getCustomModuleById(tenant.id, id);
        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        await deleteCustomModuleField(fieldId);
        return NextResponse.json(formatSuccessResponse({ success: true, message: 'Field deleted successfully' }));
    });
}
