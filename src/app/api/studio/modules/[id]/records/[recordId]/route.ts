import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getCustomRecordById, updateCustomRecord, deleteCustomRecord, getCustomModuleById } from '@/apps/studio/api';
import { validateRecordData } from '@/apps/studio/validation';

export async function GET(req: Request, ctx: { params: Promise<{ id: string; recordId: string }> }) {
    return tryCatch(async () => {
  const { id, recordId } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();
        const module = await getCustomModuleById(tenant.id, id);
        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        const record = await getCustomRecordById(recordId, tenant.id);

        if (!record || record.moduleId !== id) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        return NextResponse.json(formatSuccessResponse(record));
    });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string; recordId: string }> }) {
    return tryCatch(async () => {
  const { id, recordId } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();
        const body = await req.json();

        const module = await getCustomModuleById(tenant.id, id);
        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        const existingRecord = await getCustomRecordById(recordId, tenant.id);
        if (!existingRecord || existingRecord.moduleId !== id) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        try {
            const mergedData = { ...existingRecord.data, ...body.data };

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

            const validatedData = validateRecordData(fields, mergedData);

            const updatedRecord = await updateCustomRecord(recordId, tenant.id, validatedData);
            return NextResponse.json(formatSuccessResponse(updatedRecord));
        } catch (error: any) {
            if (error.errors) {
                return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
            }
            throw error;
        }
    });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; recordId: string }> }) {
    return tryCatch(async () => {
  const { id, recordId } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();

        const existingRecord = await getCustomRecordById(recordId, tenant.id);
        if (!existingRecord || existingRecord.moduleId !== id) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        await deleteCustomRecord(recordId, tenant.id);
        return NextResponse.json(formatSuccessResponse({ success: true, message: 'Record deleted successfully' }));
    });
}
