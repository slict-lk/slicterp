import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';

export const dynamic = 'force-dynamic';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const { tenantId } = await requireTenantContext({ moduleId: 'accounting', action: 'create' });

        // Check if period exists
        const period = await prisma.accountingPeriod.findFirst({
            where: {
                id: resolvedParams.id,
                tenantId
            }
        });

        if (!period) {
            return NextResponse.json({ error: 'Period not found' }, { status: 404 });
        }

        if (period.status === 'CLOSED') {
            return NextResponse.json({ error: 'Period is already closed' }, { status: 400 });
        }

        // Wrap the check and update in a transaction
        const updatedPeriod = await prisma.$transaction(async (tx) => {
            const unpostedEntries = await tx.journalEntry.count({
                where: {
                    periodId: resolvedParams.id,
                    tenantId,
                    status: { not: 'POSTED' }
                }
            });

            if (unpostedEntries > 0) {
                throw new Error(`Cannot close period. There are ${unpostedEntries} unposted journal entries.`);
            }

            return await tx.accountingPeriod.update({
                where: { id: resolvedParams.id, tenantId },
                data: {
                    status: 'CLOSED',
                    closedAt: new Date(),
                }
            });
        });

        return NextResponse.json(updatedPeriod);
    } catch (error: any) {
        console.error('Error closing period:', error);
        // Return 400 for business-rule violations
        if (error?.message?.includes('Cannot close period')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to close period' }, { status: 500 });
    }
}
