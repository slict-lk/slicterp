import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/accounting/module-mappings?moduleSlug=spareparts
 *
 * Returns account mappings for a specific module or all modules.
 */
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const moduleSlug = searchParams.get('moduleSlug');
        const tenantId = session.user.tenantId;

        const where: any = { tenantId };
        if (moduleSlug) where.moduleSlug = moduleSlug;

        const mappings = await prisma.moduleAccountMapping.findMany({
            where,
            include: {
                debitAccount: { select: { id: true, code: true, name: true } },
                creditAccount: { select: { id: true, code: true, name: true } },
            },
            orderBy: [{ moduleSlug: 'asc' }, { eventType: 'asc' }]
        });

        return NextResponse.json(mappings);
    } catch (error: any) {
        console.error('[Module Mappings GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 });
    }
}

/**
 * PUT /api/accounting/module-mappings
 *
 * Updates an existing mapping or creates a new one.
 * Body: { moduleSlug, eventType, debitAccountId, creditAccountId, description? }
 */
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }
        const tenantId = session.user.tenantId;

        if (!body.moduleSlug || !body.eventType || !body.debitAccountId || !body.creditAccountId) {
            return NextResponse.json(
                { error: 'moduleSlug, eventType, debitAccountId, and creditAccountId are required' },
                { status: 400 }
            );
        }

        // Validate accounts belong to this tenant
        const [debitAccount, creditAccount] = await Promise.all([
            prisma.account.findFirst({ where: { id: body.debitAccountId, tenantId } }),
            prisma.account.findFirst({ where: { id: body.creditAccountId, tenantId } }),
        ]);

        if (!debitAccount) {
            return NextResponse.json({ error: 'Debit account not found or does not belong to tenant' }, { status: 400 });
        }
        if (!creditAccount) {
            return NextResponse.json({ error: 'Credit account not found or does not belong to tenant' }, { status: 400 });
        }

        const mapping = await prisma.moduleAccountMapping.upsert({
            where: {
                tenantId_moduleSlug_eventType: {
                    tenantId,
                    moduleSlug: body.moduleSlug,
                    eventType: body.eventType,
                }
            },
            update: {
                debitAccountId: body.debitAccountId,
                creditAccountId: body.creditAccountId,
                description: body.description || undefined,
            },
            create: {
                tenantId,
                moduleSlug: body.moduleSlug,
                eventType: body.eventType,
                debitAccountId: body.debitAccountId,
                creditAccountId: body.creditAccountId,
                description: body.description || `Custom mapping for ${body.moduleSlug} ${body.eventType}`,
            }
        });

        return NextResponse.json(mapping);
    } catch (error: any) {
        console.error('[Module Mappings PUT] Error:', error);
        return NextResponse.json({ error: 'Failed to update mapping' }, { status: 500 });
    }
}
