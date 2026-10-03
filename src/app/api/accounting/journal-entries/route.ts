import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { requireTenantContext } from '@/lib/server/erp-context';
import { JournalEntryStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { tenantId } = await requireTenantContext({ moduleId: 'accounting', action: 'view' });

        const { searchParams } = new URL(request.url);
        const statusParam = searchParams.get('status') as JournalEntryStatus | null;
        const validStatuses = ['DRAFT', 'POSTED', 'VOID'];
        if (statusParam && !validStatuses.includes(statusParam)) {
            return NextResponse.json({ error: 'Invalid status parameter' }, { status: 400 });
        }
        const periodId = searchParams.get('periodId');
        const reference = searchParams.get('reference');

        // Advanced filtering
        const journalEntries = await prisma.journalEntry.findMany({
            where: {
                tenantId,
                ...(statusParam && { status: statusParam }),
                ...(periodId && { periodId }),
                ...(reference && {
                    reference: { contains: reference, mode: 'insensitive' }
                }),
            },
            include: {
                lines: {
                    include: {
                        account: true,
                    }
                },
                period: true,
            },
            orderBy: { entryDate: 'desc' },
            take: 100, // Limit to 100 for performance (should implement real pagination)
        });

        return NextResponse.json(journalEntries);
    } catch (error) {
        console.error('Error fetching journal entries:', error);
        return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { tenantId, user } = await requireTenantContext({ moduleId: 'accounting', action: 'create' });
        const body = await request.json();

        if (!body.periodId) {
            return NextResponse.json({ error: 'Period ID is required' }, { status: 400 });
        }

        // 1. Period Validation
        const period = await prisma.accountingPeriod.findFirst({
            where: {
                id: body.periodId,
                tenantId
            }
        });

        if (!period) {
            return NextResponse.json({ error: 'Accounting period not found' }, { status: 404 });
        }

        if (period.status === 'CLOSED') {
            return NextResponse.json({ error: 'Cannot post to a closed accounting period' }, { status: 400 });
        }

        // Check if the entry date falls within the period dates
        const entryDate = new Date(body.entryDate);
        if (isNaN(entryDate.getTime())) {
            return NextResponse.json({ error: 'Invalid entry date' }, { status: 400 });
        }

        if (entryDate < period.startDate || entryDate > period.endDate) {
            return NextResponse.json({ error: 'Entry date must fall within the selected accounting period' }, { status: 400 });
        }

        // 2. Double-Entry Validation (Debits = Credits)
        if (!body.lines || !Array.isArray(body.lines) || body.lines.length < 2) {
            return NextResponse.json({ error: 'A journal entry must have at least 2 lines (one debit, one credit)' }, { status: 400 });
        }

        let debitCents = 0;
        let creditCents = 0;

        for (const line of body.lines) {
            debitCents += Math.round(Number(line.debit || 0) * 100);
            creditCents += Math.round(Number(line.credit || 0) * 100);
        }

        // Check for equality in integer cents
        if (debitCents !== creditCents) {
            const totalDebits = debitCents / 100;
            const totalCredits = creditCents / 100;
            return NextResponse.json({
                error: `Journal entry must be balanced. Total Debits (${totalDebits}) do not equal Total Credits (${totalCredits})`
            }, { status: 400 });
        }

        // 3. Create the Journal Entry in a Transaction
        const journalEntry = await prisma.$transaction(async (tx) => {
            // Create header
            const entry = await tx.journalEntry.create({
                data: {
                    tenantId,
                    periodId: body.periodId,
                    reference: body.reference,
                    description: body.description,
                    entryDate: entryDate,
                    status: 'POSTED',
                    // Need actual auth for postedBy
                    lines: {
                        create: body.lines.map((line: any) => ({
                            accountId: line.accountId,
                            description: line.description || body.description,
                            debit: Number(line.debit || 0),
                            credit: Number(line.credit || 0),
                            currencyCode: line.currencyCode || 'LKR', // TODO: replace with tenant.baseCurrency from tenant config
                            exchangeRate: Number(line.exchangeRate || 1),
                            // Base currency equivalent 
                            baseCurrency: Number(line.debit || 0) > 0 ? Number(line.debit || 0) * Number(line.exchangeRate || 1) : Number(line.credit || 0) * Number(line.exchangeRate || 1),
                            costCenterId: line.costCenterId,
                            projectId: line.projectId,
                        }))
                    }
                },
                include: {
                    lines: true
                }
            });

            return entry;
        });

        await publishModuleMutationEvent({
            tenantId,
            module: 'accounting',
            entity: 'journal-entry',
            event: 'created',
            actorId: user.id,
            payload: {
                journalEntryId: journalEntry.id,
                reference: journalEntry.reference,
                status: journalEntry.status,
            },
        });

        return NextResponse.json(journalEntry, { status: 201 });
    } catch (error) {
        console.error('Error creating journal entry:', error);
        return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 });
    }
}
