import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { seedModuleAccounts, seedAllModuleAccounts } from '@/lib/accounting/module-accounts-seed';

/**
 * POST /api/accounting/seed-module-accounts
 *
 * Seeds Chart of Accounts entries and default account mappings for a module.
 * Body: { moduleSlug?: string }
 *   - If moduleSlug is provided, seeds only that module
 *   - If omitted, seeds all enabled modules for the tenant
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        let body: any = {};
        try {
            const text = await request.text();
            if (text.trim()) {
                body = JSON.parse(text);
            }
        } catch {
            return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }
        const tenantId = session.user.tenantId;
        const moduleSlug = body?.moduleSlug;

        if (moduleSlug) {
            if (typeof moduleSlug !== 'string') {
                return NextResponse.json({ error: 'moduleSlug must be a string' }, { status: 400 });
            }
            const result = await seedModuleAccounts(tenantId, moduleSlug);
            return NextResponse.json({
                message: `Seeded accounts for ${moduleSlug}`,
                ...result,
            });
        }

        const result = await seedAllModuleAccounts(tenantId);
        return NextResponse.json({
            message: `Seeded accounts for ${result.modules.length} modules`,
            ...result,
        });
    } catch (error: any) {
        console.error('[Seed Module Accounts] Error:', error);
        return NextResponse.json(
            { error: 'Failed to seed module accounts' },
            { status: 500 }
        );
    }
}
