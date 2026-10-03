import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { bulkDeleteRecords, getCustomModuleById } from '@/apps/studio/api';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
    return tryCatch(async () => {
        const { id } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();
        const body: { recordIds: string[] } = await req.json();

        if (!Array.isArray(body.recordIds) || body.recordIds.length === 0) {
            return NextResponse.json({ error: 'recordIds array is required and cannot be empty' }, { status: 400 });
        }

        const module = await getCustomModuleById(tenant.id, id);
        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        await bulkDeleteRecords(body.recordIds, tenant.id, id);

        return NextResponse.json(formatSuccessResponse({ success: true, message: `${body.recordIds.length} records deleted` }));
    });
}
