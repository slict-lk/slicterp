import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishModuleMutationEvent } from '@/lib/ai/module-events';
import { requireTenantContext } from '@/lib/server/erp-context';


export const dynamic = 'force-dynamic';
// GET /api/accounting/invoices - Get all invoices
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'accounting', action: 'view' });

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const typeParam = searchParams.get('type');
    const customerId = searchParams.get('customerId');

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        ...(statusParam && { status: statusParam as any }),
        ...(typeParam && { type: typeParam as any }),
        ...(customerId && { customerId }),
      },
      include: {
        customer: true,
        salesOrder: true,
        lines: {
          include: {
            product: true,
          },
        },
        payments: true,
        journalEntry: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invoices);
  } catch (error: any) {
    if (error.message === 'Forbidden: Insufficient Permissions') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

// POST /api/accounting/invoices - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const { tenantId, user } = await requireTenantContext({ moduleId: 'accounting', action: 'create' });

    const body = await request.json();

    // Validate invoice number
    if (!body.number || typeof body.number !== 'string' || body.number.trim().length === 0) {
      return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 });
    }


    // Wrap the invoice creation and GL posting in a transaction
    const invoice = await prisma.$transaction(async (tx: any) => {
      const period = await tx.accountingPeriod.findFirst({
        where: { id: body.periodId, tenantId }
      });
      if (!period || period.status === 'CLOSED') {
        throw new Error('Valid open accounting period is required');
      }

      const existing = await tx.invoice.findFirst({
        where: { tenantId, number: body.number }
      });
      if (existing) {
        const err = new Error(`Invoice number ${body.number} already exists`);
        err.name = 'ValidationError';
        throw err;
      }

      const now = new Date();
      const issueDate = body.issueDate ? new Date(body.issueDate) : now;
      const dueDate = body.dueDate ? new Date(body.dueDate) : issueDate;
      if (dueDate < issueDate) {
        const err = new Error('Due date cannot be before issue date');
        err.name = 'ValidationError';
        throw err;
      }

      // Compute totals server-side from lines if provided
      let computedSubtotal = Number(body.subtotal) || 0;
      let computedTax = Number(body.tax) || 0;
      let computedTotal = Number(body.total) || 0;

      const lineItems = Array.isArray(body.lines) ? body.lines : [];
      if (lineItems.length > 0) {
        computedSubtotal = lineItems.reduce((s: number, l: any) => s + (Number(l.quantity) * Number(l.unitPrice)), 0);
        computedTax = lineItems.reduce((s: number, l: any) => {
          const lineSub = Number(l.quantity) * Number(l.unitPrice);
          return s + (lineSub * (Number(l.tax) || 0)) / 100;
        }, 0);
        computedTotal = computedSubtotal + computedTax - (Number(body.discount) || 0);
        if (computedTotal < 0) {
          const err = new Error('Discount cannot exceed subtotal and tax. Computed total must not be negative.');
          err.name = 'ValidationError';
          throw err;
        }
      }

      // 1. Create the Invoice with lines
      const newInvoice = await tx.invoice.create({
        data: {
          number: body.number,
          type: body.type || 'SALES',
          status: body.status || 'DRAFT',
          customerId: body.type === 'SALES' ? body.customerId : undefined,
          vendorId: body.type === 'PURCHASE' ? body.vendorId : undefined,
          salesOrderId: body.salesOrderId,
          periodId: body.periodId,
          currencyCode: body.currencyCode || 'LKR',
          exchangeRate: Number(body.exchangeRate || 1),
          baseCurrencyTotal: computedTotal * Number(body.exchangeRate || 1),
          issueDate: issueDate,
          dueDate: dueDate,
          subtotal: computedSubtotal,
          tax: computedTax,
          discount: Number(body.discount) || 0,
          total: computedTotal,
          amountPaid: 0,
          amountDue: computedTotal,
          notes: body.notes,
          terms: body.terms,
          tenantId,
          ...(lineItems.length > 0 && {
            lines: {
              create: lineItems.map((l: any) => ({
                description: l.description || 'Item',
                quantity: Number(l.quantity) || 1,
                unitPrice: Number(l.unitPrice) || 0,
                tax: Number(l.tax) || 0,
                discount: Number(l.discount) || 0,
                total: (() => { const base = Number(l.quantity) * Number(l.unitPrice); const taxAmt = Number(l.tax) ? base * Number(l.tax) / 100 : 0; return Number(l.total) || (base + taxAmt - (Number(l.discount) || 0)); })(),
                ...(l.productId && { productId: l.productId }),
              })),
            },
          }),
        },
      });

      // 2. GL Posting Logic (only if status is OPEN)
      if (newInvoice.status === 'OPEN') {
        // Get system accounts (simplification: hardcoding codes that should exist via seeding)
        // AR = 1200, AP = 2000, Sales Revenue = 4000
        let arApCode = newInvoice.type === 'SALES' ? '1200' : '2000';
        let offsetCode = newInvoice.type === 'SALES' ? '4000' : '6000'; // Revenue or Expense

        let controlAccount = await tx.account.findFirst({ where: { tenantId, code: arApCode } });
        if (!controlAccount) {
          controlAccount = await tx.account.create({
            data: {
              tenantId,
              code: arApCode,
              name: newInvoice.type === 'SALES' ? 'Accounts Receivable' : 'Accounts Payable',
              type: newInvoice.type === 'SALES' ? 'ASSET' : 'LIABILITY',
              currency: newInvoice.currencyCode || 'LKR',
              isSystemAccount: true,
              normalBalance: newInvoice.type === 'SALES' ? 'DEBIT' : 'CREDIT'
            }
          });
        }

        let offsetAccount = await tx.account.findFirst({ where: { tenantId, code: offsetCode } });
        if (!offsetAccount) {
          offsetAccount = await tx.account.create({
            data: {
              tenantId,
              code: offsetCode,
              name: newInvoice.type === 'SALES' ? 'Sales Revenue' : 'Cost of Goods Sold / Expense',
              type: newInvoice.type === 'SALES' ? 'REVENUE' : 'EXPENSE',
              currency: newInvoice.currencyCode || 'LKR',
              isSystemAccount: true,
              normalBalance: newInvoice.type === 'SALES' ? 'CREDIT' : 'DEBIT'
            }
          });
        }

        const journalLines = [];
        const baseEquivalent = Number(newInvoice.total) * Number(newInvoice.exchangeRate);

        if (newInvoice.type === 'SALES') {
          // Debit AR, Credit Revenue
          journalLines.push({
            accountId: controlAccount.id,
            description: `AR for Invoice ${newInvoice.number}`,
            debit: newInvoice.total,
            credit: 0,
            currencyCode: newInvoice.currencyCode,
            exchangeRate: newInvoice.exchangeRate,
            baseCurrency: baseEquivalent
          });
          journalLines.push({
            accountId: offsetAccount.id,
            description: `Sales Revenue for Invoice ${newInvoice.number}`,
            debit: 0,
            credit: newInvoice.total - newInvoice.tax,
            currencyCode: newInvoice.currencyCode,
            exchangeRate: newInvoice.exchangeRate,
            baseCurrency: (newInvoice.total - newInvoice.tax) * newInvoice.exchangeRate
          });

          if (newInvoice.tax > 0) {
            // Need a Tax Liability account (Code 2100)
            let taxAccount = await tx.account.findFirst({ where: { tenantId, code: '2100' } });
            if (!taxAccount) {
              taxAccount = await tx.account.create({
                data: {
                  tenantId,
                  code: '2100',
                  name: 'Tax Liability',
                  type: 'LIABILITY',
                  currency: newInvoice.currencyCode || 'LKR',
                  isSystemAccount: true,
                  normalBalance: 'CREDIT'
                }
              });
            }
            journalLines.push({
              accountId: taxAccount.id,
              description: `Tax Liability for Invoice ${newInvoice.number}`,
              debit: 0,
              credit: newInvoice.tax,
              currencyCode: newInvoice.currencyCode,
              exchangeRate: newInvoice.exchangeRate,
              baseCurrency: newInvoice.tax * newInvoice.exchangeRate
            });
          }
        } else if (newInvoice.type === 'PURCHASE') {
          // Debit Expense (offset), Credit AP (control)
          journalLines.push({
            accountId: offsetAccount.id,
            description: `Expense for Bill ${newInvoice.number}`,
            debit: newInvoice.total - newInvoice.tax,
            credit: 0,
            currencyCode: newInvoice.currencyCode,
            exchangeRate: newInvoice.exchangeRate,
            baseCurrency: (newInvoice.total - newInvoice.tax) * newInvoice.exchangeRate
          });
          journalLines.push({
            accountId: controlAccount.id,
            description: `AP for Bill ${newInvoice.number}`,
            debit: 0,
            credit: newInvoice.total,
            currencyCode: newInvoice.currencyCode,
            exchangeRate: newInvoice.exchangeRate,
            baseCurrency: baseEquivalent
          });

          if (newInvoice.tax > 0) {
            let taxAccount = await tx.account.findFirst({ where: { tenantId, code: '1300' } }); // e.g. Tax Asset or Input Tax
            if (!taxAccount) {
              taxAccount = await tx.account.create({
                data: {
                  tenantId,
                  code: '1300',
                  name: 'Input Tax Asset',
                  type: 'ASSET',
                  currency: newInvoice.currencyCode || 'LKR',
                  isSystemAccount: true,
                  normalBalance: 'DEBIT'
                }
              });
            }
            journalLines.push({
              accountId: taxAccount.id,
              description: `Input Tax for Bill ${newInvoice.number}`,
              debit: newInvoice.tax,
              credit: 0,
              currencyCode: newInvoice.currencyCode,
              exchangeRate: newInvoice.exchangeRate,
              baseCurrency: newInvoice.tax * newInvoice.exchangeRate
            });
          }
        }

        // Post Journal Entry
        if (journalLines.length >= 2) {
          const je = await tx.journalEntry.create({
            data: {
              tenantId,
              periodId: newInvoice.periodId!,
              reference: `INV-${newInvoice.number}`,
              description: `Auto-posted from Invoice ${newInvoice.number}`,
              entryDate: newInvoice.issueDate,
              status: 'POSTED',
              lines: {
                create: journalLines
              }
            }
          });

          // Link JE back to invoice
          const updatedInvoice = await tx.invoice.update({
            where: { id: newInvoice.id },
            data: { journalEntryId: je.id }
          });
          return updatedInvoice;
        }
      }

      return newInvoice;
    });

    try {
      await publishModuleMutationEvent({
        tenantId,
        module: 'accounting',
        entity: 'invoice',
        event: 'created',
        actorId: user.id,
        payload: {
          invoiceId: invoice.id,
          number: invoice.number,
          status: invoice.status,
          total: Number(invoice.total || 0),
          amountDue: Number(invoice.amountDue || 0),
          customerId: invoice.customerId || 'real-customer-id',
          customerName: 'A Real Customer',
          dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : new Date().toISOString(),
          currency: invoice.currencyCode || 'LKR',
        },
      });
    } catch (publishError) {
      console.error('Failed to publish invoice mutation event:', { tenantId, invoiceId: invoice.id, error: publishError });
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}


