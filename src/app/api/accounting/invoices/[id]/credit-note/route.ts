import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantContext } from '@/lib/server/erp-context';

export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { tenantId } = await requireTenantContext({ moduleId: 'accounting', action: 'create' });
        const body = await request.json();

        const originalInvoice = await prisma.invoice.findUnique({
            where: {
                id: id,
                tenantId
            },
            include: {
                lines: true
            }
        }) as any;

        if (!originalInvoice) {
            return NextResponse.json({ error: 'Original invoice not found' }, { status: 404 });
        }

        if (originalInvoice.type !== 'SALES') {
            return NextResponse.json({ error: 'Credit notes can only be generated for sales invoices' }, { status: 400 });
        }

        if (['CANCELLED', 'VOIDED'].includes(originalInvoice.status)) {
            return NextResponse.json({ error: 'Cannot issue a credit note for a cancelled or voided invoice' }, { status: 400 });
        }

        if (Number(originalInvoice.amountDue) <= 0) {
            return NextResponse.json({ error: 'Invoice is already fully paid and cannot be credited' }, { status: 400 });
        }

        const existingCreditNote = await prisma.invoice.findFirst({
            where: {
                tenantId,
                type: 'CREDIT_NOTE',
                number: `CN-${originalInvoice.number}`
            }
        });

        if (existingCreditNote) {
            return NextResponse.json({ error: 'Credit note already generated for this invoice' }, { status: 400 });
        }

        // Require an open period to post the credit note
        if (!body.periodId) {
            return NextResponse.json({ error: 'Accounting period is required' }, { status: 400 });
        }

        const period = await (prisma as any).accountingPeriod.findFirst({
            where: { id: body.periodId, tenantId }
        });

        if (!period || period.status === 'CLOSED') {
            return NextResponse.json({ error: 'Valid open accounting period is required' }, { status: 400 });
        }

        // Generate Credit Note Transaction
        const creditNote = await prisma.$transaction(async (tx: any) => {
            // 1. Create the new Invoice document with type CREDIT_NOTE
            const cn = await tx.invoice.create({
                data: {
                    number: `CN-${originalInvoice.number}`,
                    type: 'CREDIT_NOTE',
                    status: 'PAID',
                    customerId: originalInvoice.customerId,
                    periodId: body.periodId,
                    currencyCode: originalInvoice.currencyCode || 'LKR',
                    exchangeRate: originalInvoice.exchangeRate || 1,
                    baseCurrencyTotal: originalInvoice.baseCurrencyTotal || originalInvoice.total,
                    issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
                    dueDate: new Date(),
                    subtotal: originalInvoice.subtotal,
                    tax: originalInvoice.tax,
                    discount: originalInvoice.discount,
                    total: originalInvoice.total,
                    amountPaid: originalInvoice.total,
                    amountDue: 0,
                    notes: `Credit Note for Invoice ${originalInvoice.number}. Reason: ${body.reason || 'Not specified'}`,
                    tenantId,
                }
            });

            // 2. Post Reverse Journal Entry
            const arCode = '1200';
            const revenueCode = '4000';

            const controlAccount = await tx.account.findFirst({ where: { tenantId, code: arCode } });
            const offsetAccount = await tx.account.findFirst({ where: { tenantId, code: revenueCode } });

            if (!controlAccount || !offsetAccount) {
                throw new Error(`System accounts missing (AR: ${arCode}, Revenue: ${revenueCode})`);
            }

            const rate = cn.exchangeRate || 1;
            const baseEquivalent = Number(cn.total) * Number(rate);
            const journalLines = [];

            journalLines.push({
                accountId: offsetAccount.id,
                description: `Sales Return for ${cn.number}`,
                debit: Number(cn.total) - Number(cn.tax),
                credit: 0,
                currencyCode: cn.currencyCode || 'LKR',
                exchangeRate: rate,
                baseCurrency: (Number(cn.total) - Number(cn.tax)) * rate
            });

            journalLines.push({
                accountId: controlAccount.id,
                description: `Credit Note applied to ${originalInvoice.number}`,
                debit: 0,
                credit: Number(cn.total),
                currencyCode: cn.currencyCode || 'LKR',
                exchangeRate: rate,
                baseCurrency: baseEquivalent
            });

            if (Number(cn.tax) > 0) {
                const taxAccount = await tx.account.findFirst({ where: { tenantId, code: '2100' } });
                if (!taxAccount) {
                    throw new Error('Tax liability account (2100) is missing.');
                }
                journalLines.push({
                    accountId: taxAccount.id,
                    description: `Tax Reversal for ${cn.number}`,
                    debit: Number(cn.tax),
                    credit: 0,
                    currencyCode: cn.currencyCode || 'LKR',
                    exchangeRate: rate,
                    baseCurrency: Number(cn.tax) * rate
                });
            }

            const je = await tx.journalEntry.create({
                data: {
                    tenantId,
                    periodId: body.periodId,
                    reference: cn.number,
                    description: `Credit Note for Invoice ${originalInvoice.number}`,
                    entryDate: cn.issueDate,
                    status: 'POSTED',
                    lines: { create: journalLines }
                }
            });

            await tx.invoice.update({
                where: { id: cn.id },
                data: { journalEntryId: je.id }
            });

            // 3. Create a payment record to settle the original invoice
            await tx.payment.create({
                data: {
                    tenantId,
                    invoiceId: originalInvoice.id,
                    amount: cn.total,
                    method: 'BANK_TRANSFER',
                    status: 'CLEARED',
                    paymentDate: cn.issueDate,
                    reference: cn.number,
                    notes: 'Settled via Credit Note',
                    currencyCode: cn.currencyCode || 'LKR',
                    exchangeRate: cn.exchangeRate || 1,
                }
            });

            // Update original invoice balances
            const updatedOriginal = await tx.invoice.update({
                where: { id: originalInvoice.id },
                data: {
                    amountPaid: { increment: cn.total },
                    amountDue: { decrement: cn.total }
                }
            });

            if (updatedOriginal.amountDue <= 0.01) {
                await tx.invoice.update({
                    where: { id: originalInvoice.id },
                    data: { status: 'PAID' }
                });
            }

            return cn;
        });

        return NextResponse.json(creditNote, { status: 201 });
    } catch (error: any) {
        console.error('Error creating credit note:', error);
        return NextResponse.json({ error: error.message || 'Failed to create credit note' }, { status: 500 });
    }
}
