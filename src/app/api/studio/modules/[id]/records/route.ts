import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getCustomRecords, createCustomRecord, getCustomModuleById } from '@/apps/studio/api';
import { validateRecordData } from '@/apps/studio/validation';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryCatch(async () => {
  const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const module = await getCustomModuleById(tenant.id, id);
    if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const rawSkip = parseInt(searchParams.get('skip') || '0', 10);
    const rawTake = parseInt(searchParams.get('take') || '50', 10);
    const skip = Number.isFinite(rawSkip) ? Math.max(0, Math.floor(rawSkip)) : 0;
    const take = Number.isFinite(rawTake) ? Math.min(100, Math.max(1, Math.floor(rawTake))) : 50;
    const search = searchParams.get('search') || undefined;

    const result = await getCustomRecords(id, tenant.id, { skip, take, search });

    const resp = formatSuccessResponse(result.data);
    return NextResponse.json({ ...resp, meta: { count: result.count, skip: result.skip, take: result.take } });
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryCatch(async () => {
  const { id } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant = await getOrCreateDefaultTenant();
    const body = await req.json();

    const module = await getCustomModuleById(tenant.id, id);
    if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

    try {
      // Use DB fields if they include user-defined fields, otherwise fallback to schema.fields
      const dbFields = (module as any).fields || [];
      const schemaFields = ((module as any).schema?.fields || []).map((f: any, i: number) => ({
        id: `schema-${i}`,
        name: f.name,
        label: f.label,
        type: f.type,
        required: f.required ?? false,
        options: f.options,
        validation: f.validation,
        settings: f.settings,
      }));
      const userDbFields = dbFields.filter((f: any) => !f.isSystem);
      const fields = userDbFields.length > 0 ? dbFields : [...schemaFields, ...dbFields];

      const validatedData = validateRecordData(fields, body.data);
      const record = await createCustomRecord(id, tenant.id, validatedData, session.user.id);
      return NextResponse.json(formatSuccessResponse(record), { status: 201 });
    } catch (error: any) {
      if (error.errors) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
      }
      throw error;
    }
  });
}
