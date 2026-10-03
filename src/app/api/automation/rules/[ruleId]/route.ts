import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getAutomationRuleById, updateAutomationRule, deleteAutomationRule } from '@/apps/studio/automation-api';

export async function GET(req: Request, ctx: { params: Promise<{ ruleId: string }> }) {
  return tryCatch(async () => {
  const { ruleId } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const rule = await getAutomationRuleById(ruleId, tenant.id);

    if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    return NextResponse.json(formatSuccessResponse(rule));
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ ruleId: string }> }) {
  return tryCatch(async () => {
  const { ruleId } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const body = await req.json();

    const rule = await getAutomationRuleById(ruleId, tenant.id);
    if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

    await updateAutomationRule(ruleId, tenant.id, body);
    const updatedRule = await getAutomationRuleById(ruleId, tenant.id);

    return NextResponse.json(formatSuccessResponse(updatedRule));
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ ruleId: string }> }) {
  return tryCatch(async () => {
  const { ruleId } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();

    const rule = await getAutomationRuleById(ruleId, tenant.id);
    if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

    await deleteAutomationRule(ruleId, tenant.id);
    return NextResponse.json(formatSuccessResponse({ success: true, message: 'Rule deleted successfully' }));
  });
}
