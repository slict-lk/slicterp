// Accounting & Finance API Functions
import { prisma } from '@/lib/prisma';
import type { Invoice, Payment, Account, Expense } from './types';

export async function getInvoices(tenantId: string) {
  return await prisma.invoice.findMany({
    where: { tenantId },
    include: {
      customer: true,
      lines: {
        include: { product: true },
      },
      payments: true,
    },
    orderBy: { issueDate: 'desc' },
  });
}

export async function createInvoice(data: Partial<Invoice> & { tenantId: string }) {
  return await prisma.invoice.create({
    data: {
      number: data.invoiceNumber || `INV-${Date.now()}`,
      status: data.status || 'DRAFT',
      type: data.type || 'SALES',
      customerId: data.customerId!,
      issueDate: data.issueDate || new Date(),
      dueDate: data.dueDate!,
      subtotal: data.subtotal!,
      tax: data.tax || 0,
      total: data.total!,
      amountPaid: data.amountPaid || 0,
      amountDue: data.amountDue!,
      notes: data.notes,
      tenantId: data.tenantId,
    },
  });
}

export async function getPayments(tenantId: string) {
  return await prisma.payment.findMany({
    where: { tenantId },
    include: { invoice: true },
    orderBy: { paymentDate: 'desc' },
  });
}

export async function createPayment(data: Partial<Payment> & { tenantId: string }) {
  return await prisma.payment.create({
    data: {
      reference: data.paymentNumber || data.reference,
      amount: data.amount!,
      paymentDate: data.paymentDate || new Date(),
      method: data.method!,
      invoiceId: data.invoiceId!,
      tenantId: data.tenantId,
      notes: (data as any).notes,
    },
  });
}

export async function getAccounts(tenantId: string) {
  return await prisma.account.findMany({
    where: { tenantId },
    include: {
      parent: true,
      children: true,
    },
    orderBy: { code: 'asc' },
  });
}

export async function getExpenses(tenantId: string) {
  return await prisma.expense.findMany({
    where: { tenantId },
    include: { employee: true },
    orderBy: { expenseDate: 'desc' },
  });
}
