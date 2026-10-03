import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch, formatSuccessResponse } from '@/lib/error-handler';
import { getCustomModuleById } from '@/apps/studio/api';
import { validateRecordData } from '@/apps/studio/validation';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
    return tryCatch(async () => {
        const { id } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();

        // Parse multipart form data
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
        }

        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
        }
        if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
            return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 });
        }

        const module = await getCustomModuleById(tenant.id, id);
        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

        if (parsed.errors && parsed.errors.length > 0) {
            return NextResponse.json({ error: 'Failed to parse CSV', details: parsed.errors }, { status: 400 });
        }

        const recordsToCreate = [];
        const errors = [];

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

        for (let i = 0; i < parsed.data.length; i++) {
            const row = parsed.data[i] as any;
            const recordData: any = {};

            fields.forEach((f: any) => {
                if (row[f.name] !== undefined) {
                    recordData[f.name] = row[f.name];
                }
            });

            try {
                const validated = validateRecordData(fields, recordData);
                recordsToCreate.push({
                    moduleId: module.id,
                    tenantId: tenant.id,
                    createdById: session.user.id,
                    data: validated
                });
            } catch (e: any) {
                errors.push({ row: i + 1, data: row, errors: e.errors || e.message });
            }
        }

        if (errors.length > 0) {
            return NextResponse.json({ error: 'Validation errors found in CSV', details: errors }, { status: 400 });
        }

        let result;
        if (recordsToCreate.length > 0) {
            result = await prisma.customRecord.createMany({
                data: recordsToCreate
            });
        }

        return NextResponse.json(formatSuccessResponse({ success: true, count: result?.count || 0, message: `Successfully imported ${result?.count || 0} records` }));
    });
}
