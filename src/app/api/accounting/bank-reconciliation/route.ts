import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const tenant = await getOrCreateDefaultTenant();

        // Auth Check
        const { requirePermission } = await import('@/lib/auth');
        await requirePermission('accounting', 'view');

        const { searchParams } = new URL(request.url);
        const bankAccountId = searchParams.get('bankAccountId');

        if (!bankAccountId) {
            return NextResponse.json({ error: 'Bank account ID is required' }, { status: 400 });
        }

        // Fetch the un-reconciled statements
        const statements = await prisma.bankStatement.findMany({
            where: {
                tenantId: tenant.id,
                bankAccountId: bankAccountId,
            },
            include: {
                lines: {
                    where: {
                        status: 'UNRECONCILED'
                    }
                }
            },
            orderBy: { periodEnd: 'desc' }
        });

        return NextResponse.json(statements);

    } catch (error) {
        console.error(`Error fetching bank statements:`, error);
        return NextResponse.json({ error: `Failed to fetch bank statements` }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    // Creating a new bank statement (typically parsed from CSV/MT940 in real life)
    try {
        const tenant = await getOrCreateDefaultTenant();
        const { requirePermission } = await import('@/lib/auth');
        await requirePermission('accounting', 'create');

        const body = await request.json();

        if (!body.bankAccountId) {
            return NextResponse.json({ error: 'Bank account ID is required' }, { status: 400 });
        }

        const bankAccount = await prisma.account.findFirst({
            where: { id: body.bankAccountId, tenantId: tenant.id }
        });

        if (!bankAccount) {
            return NextResponse.json({ error: 'Invalid bank account' }, { status: 400 });
        }

        if (!Array.isArray(body.lines)) {
            return NextResponse.json({ error: 'Lines must be an array' }, { status: 400 });
        }

        const statement = await prisma.$transaction(async (tx) => {
            const stmt = await tx.bankStatement.create({
                data: {
                    tenantId: tenant.id,
                    bankAccountId: body.bankAccountId,
                    periodStart: new Date(body.periodStart),
                    periodEnd: new Date(body.periodEnd),
                    openingBalance: body.openingBalance,
                    closingBalance: body.closingBalance,
                    lines: {
                        create: body.lines.map((line: any) => ({
                            date: new Date(line.date),
                            description: line.description,
                            amount: line.amount,
                            balance: line.balance,
                            reference: line.reference,
                            status: 'UNRECONCILED'
                        }))
                    }
                },
                include: { lines: true }
            });
            return stmt;
        });

        return NextResponse.json(statement, { status: 201 });
    } catch (error) {
        console.error('Error creating bank statement:', error);
        return NextResponse.json({ error: 'Failed to create statement' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    // Matching a statement line to a payment
    try {
        const tenant = await getOrCreateDefaultTenant();
        const { requirePermission } = await import('@/lib/auth');
        await requirePermission('accounting', 'edit');

        const body = await request.json();
        const { statementLineId, paymentId } = body;

        if (!statementLineId || !paymentId) {
            return NextResponse.json({ error: 'Both statementLineId and paymentId are required' }, { status: 400 });
        }

        const [line, payment] = await Promise.all([
            prisma.bankStatementLine.findUnique({
                where: { id: statementLineId },
                include: { statement: true }
            }),
            prisma.payment.findUnique({
                where: { id: paymentId }
            })
        ]);

        if (!line || line.statement.tenantId !== tenant.id) {
            return NextResponse.json({ error: 'Bank statement line not found' }, { status: 400 });
        }

        if (!payment || payment.tenantId !== tenant.id) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 400 });
        }

        if (Math.round(Math.abs(Number(line.amount)) * 100) !== Math.round(Number(payment.amount) * 100)) {
            return NextResponse.json({ error: 'Amount mismatch between statement line and payment' }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const line = await tx.bankStatementLine.update({
                where: { id: statementLineId },
                data: {
                    status: 'RECONCILED',
                    paymentId: paymentId
                }
            });

            await tx.payment.update({
                where: { id: paymentId },
                data: { status: 'RECONCILED' }
            });

            return line;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error reconciling line:', error);
        return NextResponse.json({ error: 'Failed to reconcile bank statement' }, { status: 500 });
    }
}
