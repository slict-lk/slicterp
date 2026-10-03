// Sales & CRM API Functions
import { prisma } from '@/lib/prisma';
import type { SalesOrder, Lead, Customer, Quotation } from './types';

export async function getSalesOrders(tenantId: string) {
  return await prisma.salesOrder.findMany({
    where: { tenantId },
    include: {
      customer: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createSalesOrder(data: Partial<SalesOrder> & { tenantId: string }) {
  return await prisma.salesOrder.create({
    data: {
      number: data.orderNumber || `SO-${Date.now()}`,
      status: data.status || 'DRAFT',
      customerId: data.customerId!,
      orderDate: data.orderDate || new Date(),
      total: data.total!,
      tax: data.tax || 0,
      discount: data.discount || 0,
      grandTotal: (data as any).grandTotal ?? data.total!,
      notes: data.notes,
      tenantId: data.tenantId,
    },
  });
}

export async function getLeads(tenantId: string) {
  return await prisma.lead.findMany({
    where: { tenantId },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createLead(data: Partial<Lead> & { tenantId: string }) {
  return await prisma.lead.create({
    data: {
      name: data.name!,
      email: data.email!,
      phone: data.phone,
      source: data.source,
      status: data.status || 'NEW',
      score: (data as any).score || 0,
      notes: (data as any).notes,
      customerId: data.customerId,
      tenantId: data.tenantId,
    },
  });
}

export async function getCustomers(tenantId: string) {
  return await prisma.customer.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
}

export async function createCustomer(data: Partial<Customer> & { tenantId: string }) {
  return await prisma.customer.create({
    data: {
      name: data.name!,
      email: data.email!,
      phone: data.phone,
      type: data.type || 'INDIVIDUAL',
      address: (data.address as any)?.street || (data as any).street,
      city: (data.address as any)?.city || (data as any).city,
      state: (data.address as any)?.state || (data as any).state,
      zipCode: (data.address as any)?.zipCode || (data as any).zipCode,
      country: (data.address as any)?.country || (data as any).country || 'US',
      tenantId: data.tenantId,
    },
  });
}
