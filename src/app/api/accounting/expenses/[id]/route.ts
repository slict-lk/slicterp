import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { postToGL, resolveAccountCodes } from '@/lib/accounting/gl-bridge';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant = await getOrCreateDefaultTenant();
        const { id } = await params;
        const body = await request.json();

        const existingExpense = await prisma.expense.findFirst({
            where: { id, tenantId: tenant.id },
            include: { employee: true }
        });

        if (!existingExpense) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        const expense = await prisma.expense.update({
            where: { id, tenantId: existingExpense.tenantId },
            data: {
                ...(body.status && { status: body.status }),
                ...(body.notes && { notes: body.notes }),
            },
            include: {
                employee: true,
            },
        });

        // --- GL POSTING ---
        if (body.status === 'APPROVED' && existingExpense.status !== 'APPROVED') {
            try {
                const accounts = await resolveAccountCodes(tenant.id, 'hr', 'EXPENSE_PAYMENT');
                if (accounts) {
                    await postToGL({
                        tenantId: tenant.id,
                        sourceModule: 'hr',
                        sourceDocumentId: expense.id,
                        sourceDocumentType: 'Expense',
                        eventType: 'EXPENSE_PAYMENT',
                        reference: `EXP-${expense.id.slice(-6)}`,
                        description: `Employee Expense Approved - ${expense.employee?.firstName || 'Unknown'} - ${expense.description || 'No description'}`,
                        date: new Date(),
                        lines: [
                            { accountCode: accounts.debitCode, debit: expense.amount, credit: 0, description: `Expense: ${expense.category}` },
                            { accountCode: accounts.creditCode, debit: 0, credit: expense.amount, description: 'Accounts Payable / Cash' }
                        ]
                    });
                }
            } catch (error) {
                console.error('GL Bridge error (expense approval):', error);
                // Mark expense GL status as failed so retries can be performed
                await prisma.expense.update({
                    where: { id: expense.id, tenantId: expense.tenantId },
                    data: { notes: `${(expense.notes || '').substring(0, 500)}\n[GL POSTING FAILED]` }
                }).catch(e => console.error('Failed to update expense GL note:', e));
            }
        }

        return NextResponse.json(expense);
    } catch (error) {
        console.error('Error updating expense:', error);
        return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
    }
}
