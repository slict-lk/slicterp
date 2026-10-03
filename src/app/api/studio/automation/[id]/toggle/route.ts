import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { toggleAutomationRule, getAutomationRuleById } from '@/apps/studio/automation-api';

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
    return tryCatch(async () => {
  const { id } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        if (typeof body.isActive !== 'boolean') {
            return NextResponse.json({ error: 'isActive boolean flag is required' }, { status: 400 });
        }

        const rule = await getAutomationRuleById(id, tenant.id);
        if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

        await toggleAutomationRule(id, tenant.id, body.isActive);

        return NextResponse.json(formatSuccessResponse({ success: true, isActive: body.isActive }));
    });
}
