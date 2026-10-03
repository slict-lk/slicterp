import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { tryCatch } from '@/lib/error-handler';
import { getCustomRecords, getCustomModuleById } from '@/apps/studio/api';
import Papa from 'papaparse';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
    return tryCatch(async () => {
        const { id } = await ctx.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenant = await getOrCreateDefaultTenant();

        const module = await getCustomModuleById(tenant.id, id);
        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        const result = await getCustomRecords(id, tenant.id, { take: 10000 });

        const records = result.data.map((record) => {
            const row = { id: record.id };
            const data = record.data as any;
            (module as any).fields?.forEach((field: any) => {
                row[field.name as keyof typeof row] = data[field.name] !== undefined ? data[field.name] : '';
            });
            return row;
        });

        // Sanitize CSV values to prevent injection (leading =, +, -, @, \t, \r)
        const sanitizedRecords = records.map(row => {
          const sanitized: Record<string, any> = {};
          for (const [key, value] of Object.entries(row)) {
            if (typeof value === 'string' && /^[=+\-@\t\r]/.test(value)) {
              sanitized[key] = `'${value}`;
            } else {
              sanitized[key] = value;
            }
          }
          return sanitized;
        });

        const csv = Papa.unparse(sanitizedRecords);
        const safeSlug = module.slug.replace(/[^a-zA-Z0-9_-]/g, '_');

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${safeSlug}_export.csv"`
            }
        });
    });
}
