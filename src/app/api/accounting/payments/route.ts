import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { requireTenantContext } from '@/lib/server/erp-context';


export const dynamic = 'force-dynamic';
// GET /api/accounting/payments - Get all payments
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'accounting', action: 'view' });
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const method = searchParams.get('method') as any;

    const payments = await prisma.payment.findMany({
      where: {
        tenantId,
        ...(invoiceId && { invoiceId }),
        ...(method && { method }),
      },
      include: {
        invoice: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

// POST /api/accounting/payments - Create new payment
export async function POST(request: NextRequest) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'accounting', action: 'create' });

    const body = await request.json();

    if (!body.invoiceId || !body.amount) {
      return NextResponse.json({ error: 'Valid invoiceId and amount are required' }, { status: 400 });
    }
    const amountNum = Number(body.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive finite number' }, { status: 400 });
    }
    if (!body.periodId || typeof body.periodId !== 'string' || body.periodId.trim().length === 0) {
      return NextResponse.json({ error: 'Valid periodId is required' }, { status: 400 });
    }

    // Base validation for period locking
    const period = await prisma.accountingPeriod.findFirst({
      where: {
        id: body.periodId,
        tenantId
      }
    });

    if (!period) {
      return NextResponse.json({ error: 'Accounting period is required and must be valid' }, { status: 400 });
    }

    if (period.status === 'CLOSED') {
      return NextResponse.json({ error: 'Cannot post payment to a closed accounting period' }, { status: 400 });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const relatedInvoice = await tx.invoice.findUnique({
        where: { id: body.invoiceId, tenantId }
      });

      if (!relatedInvoice) {
        throw new Error('NOT_FOUND:Related invoice not found');
      }

      if (amountNum > Number(relatedInvoice.amountDue)) {
        throw new Error('VALIDATION:Payment amount cannot exceed invoice amount due');
      }

      // 1. Create the Payment
      const newPayment = await tx.payment.create({
        data: {
          invoiceId: body.invoiceId,
          amount: amountNum,
          status: body.status || 'CLEARED',
          method: body.method || 'CASH',
          currencyCode: body.currencyCode || 'LKR',
          exchangeRate: Number(body.exchangeRate || 1),
          reference: body.reference,
          notes: body.notes,
          paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
          tenantId,
        },
        include: {
          invoice: true,
        },
      });

      // 2. Update Invoice Paid Amount
      const updatedInvoice = await tx.invoice.update({
        where: { id: body.invoiceId },
        data: {
          amountPaid: { increment: body.amount },
          amountDue: { decrement: body.amount },
        },
      });

      // Update status to PAID if fully paid
      if (Number(updatedInvoice.amountDue) <= 0.01) { // EPSILON for float safely
        await tx.invoice.update({
          where: { id: body.invoiceId },
          data: { status: 'PAID' }
        });
      }

      // 3. Post to GL if the payment is CLEARED or RECONCILED
      if (newPayment.status === 'CLEARED' || newPayment.status === 'RECONCILED') {
        // Find default Cash/Bank Account + AP/AR Control Accounts
        // Usually Cash/Bank = 1000, AR = 1200, AP = 2000
        let bankCode = '1000';
        let arApCode = relatedInvoice.type === 'SALES' ? '1200' : '2000';

        const bankAccount = await tx.account.findFirst({ where: { tenantId, code: bankCode } });
        const arApAccount = await tx.account.findFirst({ where: { tenantId, code: arApCode } });

        if (!bankAccount || !arApAccount) {
          throw new Error(`System accounts missing (Bank: ${bankCode}, AR/AP: ${arApCode})`);
        }

        const journalLines = [];
        const baseEquivalent = Number(newPayment.amount) * Number(newPayment.exchangeRate);

        if (relatedInvoice.type === 'SALES') {
          // Debit Cash/Bank, Credit AR
          journalLines.push({
            accountId: bankAccount.id,
            description: `Payment received for Invoice ${relatedInvoice.number}`,
            debit: newPayment.amount,
            credit: 0,
            currencyCode: newPayment.currencyCode,
            exchangeRate: newPayment.exchangeRate,
            baseCurrency: baseEquivalent
          });
          journalLines.push({
            accountId: arApAccount.id,
            description: `Payment applied to Invoice ${relatedInvoice.number}`,
            debit: 0,
            credit: newPayment.amount,
            currencyCode: newPayment.currencyCode,
            exchangeRate: newPayment.exchangeRate,
            baseCurrency: baseEquivalent
          });
        } else {
          // Purchase: Debit AP, Credit Cash/Bank
          journalLines.push({
            accountId: arApAccount.id,
            description: `Payment sent for Bill ${relatedInvoice.number}`,
            debit: newPayment.amount,
            credit: 0,
            currencyCode: newPayment.currencyCode,
            exchangeRate: newPayment.exchangeRate,
            baseCurrency: baseEquivalent
          });
          journalLines.push({
            accountId: bankAccount.id,
            description: `Funds outgoing for Bill ${relatedInvoice.number}`,
            debit: 0,
            credit: newPayment.amount,
            currencyCode: newPayment.currencyCode,
            exchangeRate: newPayment.exchangeRate,
            baseCurrency: baseEquivalent
          });
        }

        const je = await tx.journalEntry.create({
          data: {
            tenantId,
            periodId: body.periodId,
            reference: `PAY-${newPayment.id.slice(-6).toUpperCase()}`,
            description: `Payment for ${relatedInvoice.number}`,
            entryDate: newPayment.paymentDate,
            status: 'POSTED',
            lines: {
              create: journalLines
            }
          }
        });

        // Link JE to Payment
        const finalPayment = await tx.payment.update({
          where: { id: newPayment.id },
          data: { journalEntryId: je.id },
          include: { invoice: true }
        });
        return finalPayment;
      }

      return newPayment;
    });

    try {
      await publishModuleMutationEvent({
        tenantId,
        module: 'accounting',
        entity: 'payment',
        event: 'created',
        actorId: user.id,
        payload: {
          paymentId: payment.id,
          invoiceId: payment.invoiceId,
          amount: Number(payment.amount || 0),
          status: payment.status,
        },
      });
    } catch (publishError) {
      console.error('Failed to publish payment mutation event:', { tenantId, paymentId: payment.id, userId: user.id, error: publishError });
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payment:', error);
    if (error.message?.startsWith('NOT_FOUND:')) {
      return NextResponse.json({ error: error.message.slice('NOT_FOUND:'.length).trim() }, { status: 404 });
    }
    if (error.message?.startsWith('VALIDATION:')) {
      return NextResponse.json({ error: error.message.slice('VALIDATION:'.length).trim() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}


