import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getCustomModuleFields, createCustomModuleField, getCustomModuleById } from '@/apps/studio/api';
import type { CreateFieldInput } from '@/apps/studio/types';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
    return tryCatch(async () => {
  const { id } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();

        const module = await getCustomModuleById(tenant.id, id);
        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        const fields = await getCustomModuleFields(id);
        return NextResponse.json(formatSuccessResponse(fields));
    });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
    return tryCatch(async () => {
  const { id } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();
        const body = await req.json();

        if (!body.name || !body.label || !body.type) {
            return NextResponse.json({ error: 'Missing required field properties' }, { status: 400 });
        }

        const module = await getCustomModuleById(tenant.id, id);
        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        const sanitizedBody = {
          name: body.name,
          label: body.label,
          type: body.type,
          required: body.required ?? false,
          defaultValue: body.defaultValue,
          options: body.options,
          validation: body.validation,
          sequence: body.sequence ?? 0,
          isSystem: false,
          settings: body.settings,
        } satisfies CreateFieldInput;
        const field = await createCustomModuleField(id, sanitizedBody);
        return NextResponse.json(formatSuccessResponse(field), { status: 201 });
    });
}
