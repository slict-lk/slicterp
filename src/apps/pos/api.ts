// Point of Sale Module API Functions
import { prisma } from '@/lib/prisma';
import { postToGL, resolveAccountCodes } from '@/lib/accounting/gl-bridge';
import { recordStockOut } from '@/lib/inventory/inventory-bridge';
import type { POSOrder, POSSession, POSConfig } from './types';

const client = prisma as any;

/**
 * Default cost margin used when specific product or tenant cost margin is missing.
 * Represents a 40% margin on the sale price.
 */
const DEFAULT_COST_MARGIN = 0.4;

// POS Configuration
export async function getPOSConfigs(tenantId: string) {
  return await client.pOSConfig.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
}

export async function createPOSConfig(data: Partial<POSConfig> & { tenantId: string }) {
  if (!data.name || !data.warehouseId) {
    throw new Error('Name and warehouseId are required to create a POS config');
  }
  return await client.pOSConfig.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      warehouseId: data.warehouseId,
      allowDiscount: data.allowDiscount !== false,
      maxDiscount: data.maxDiscount ?? 0,
    }
  });
}

// POS Sessions
export async function getPOSSessions(tenantId: string, status?: 'OPEN' | 'CLOSED') {
  return await client.pOSSession.findMany({
    where: {
      tenantId,
      ...(status && { status }),
    },
    include: {
      config: true,
      user: true,
    },
    orderBy: { startDate: 'desc' },
  });
}

export async function getCurrentSession(tenantId: string, userId: string) {
  return await client.pOSSession.findFirst({
    where: {
      tenantId,
      userId,
      status: 'OPEN',
    },
    include: {
      config: true,
    },
  });
}

export async function openPOSSession(data: {
  posConfigId: string;
  userId: string;
  openingCash: number;
  tenantId: string;
}) {
  return await client.pOSSession.create({
    data: {
      name: `Session ${new Date().toLocaleDateString()}`,
      posConfigId: data.posConfigId,
      userId: data.userId,
      startDate: new Date(),
      openingCash: data.openingCash,
      status: 'OPEN',
      tenantId: data.tenantId,
    },
    include: {
      config: true,
      user: true,
    },
  });
}

export async function closePOSSession(
  sessionId: string,
  closingCash: number,
  tenantId: string
) {
  return await prisma.$transaction(async (tx: any) => {
    const session = await tx.pOSSession.findUnique({
      where: { id: sessionId },
      include: {
        orders: {
          include: { payments: true }
        }
      }
    });

    if (!session || session.tenantId !== tenantId) {
      throw new Error('Session not found or access denied');
    }

    if (session.status !== 'OPEN') {
      throw new Error('Session is already closed');
    }

    let totalSales = 0;
    let expectedCash = (() => { const v = Number(session.openingCash); return Number.isFinite(v) ? v : 0; })();
    const orderCount = session.orders.length;

    for (const order of session.orders) {
      totalSales += (() => { const v = Number(order.totalAmount); return Number.isFinite(v) ? v : 0; })();
      for (const pay of order.payments) {
        if (pay.method === 'CASH') {
          expectedCash += Number(pay.amount) || 0;
        }
      }
    }

    const difference = closingCash - expectedCash;

    await tx.pOSSession.update({
      where: { id: sessionId },
      data: {
        closingCash,
        status: 'CLOSED',
        endDate: new Date()
      }
    });

    return {
      sessionId,
      closingCash,
      expectedCash,
      difference,
      totalSales,
      orderCount,
    };
  });
}

// POS Orders
export async function getPOSOrders(tenantId: string, _sessionId?: string) {
  return await client.pOSOrder.findMany({
    where: {
      tenantId,
    },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createPOSOrder(data: any & { tenantId: string }) {
  const total = Number(data.total) || 0;

  const tenantConfig = await client.tenant.findUnique({
    where: { id: data.tenantId },
    select: { settings: true }
  });
  const posCostMargin = tenantConfig?.settings?.posCostMargin ?? DEFAULT_COST_MARGIN;

  const computeUnitCost = (item: any, defaultMargin: number) => {
    return Number(item.product?.costPrice ?? item.product?.cost ?? (Number(item.product?.price ?? item.unitPrice) * (item.product?.costMargin ?? posCostMargin ?? defaultMargin)));
  };

  return await client.$transaction(async (tx: any) => {
    const resultOrder = await tx.pOSOrder.create({
      data: {
        orderNumber: data.orderNumber || `POS - ${Date.now()}`,
        customerId: data.customerId,
        subtotal: Number(data.subtotal) || total,
        tax: Number(data.tax) || 0,
        discount: Number(data.discount) || 0,
        total,
        paymentMethod: data.paymentMethod || 'CASH',
        status: data.status || 'PENDING',
        notes: data.notes || '',
        tenantId: data.tenantId,
        items: {
          create: (data.items || []).map((item: any) => {
            const up = Number(item.unitPrice);
            const t = Number(item.total);
            const qty = Math.round(Number(item.quantity));
            return {
              productId: item.productId,
              quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
              unitPrice: Number.isFinite(up) ? up : 0,
              total: Number.isFinite(t) ? t : 0,
              tenantId: data.tenantId,
            };
          }),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      },
    });

    const isCompletedOrPaid = resultOrder.status === 'COMPLETED' || resultOrder.status === 'PAID';

    if (isCompletedOrPaid) {
      const defaultWarehouse = await tx.invWarehouse.findFirst({ where: { tenantId: data.tenantId, isDefault: true } })
        || await tx.invWarehouse.findFirst({ where: { tenantId: data.tenantId } });

      if (defaultWarehouse) {
        for (const item of resultOrder.items) {
          const cost = computeUnitCost(item, DEFAULT_COST_MARGIN);
          await recordStockOut('OUT', {
            tenantId: data.tenantId,
            productId: item.productId,
            productName: item.product?.name || `POS Item ${item.productId}`,
            productCategory: item.product?.categoryId || 'POS/Restaurant',
            productPrice: Number(item.unitPrice),
            warehouseId: defaultWarehouse.id,
            quantity: Number(item.quantity),
            unitCost: cost,
            sourceModule: 'pos',
            sourceDocument: resultOrder.id,
            reference: `POS - ${resultOrder.orderNumber}`
          }, tx);
        }

        const isCard = data.paymentMethod?.toUpperCase().includes('CARD');
        const eventType = isCard ? 'SALE_CARD' : 'SALE_CASH';
        const accounts = await resolveAccountCodes(data.tenantId, 'pos', eventType, tx);

        if (accounts && resultOrder.total > 0 && isCompletedOrPaid) {
          await postToGL({
            tenantId: data.tenantId,
            sourceModule: 'pos',
            sourceDocumentId: resultOrder.id,
            sourceDocumentType: 'POSOrder',
            eventType,
            reference: `POS - SALE - ${resultOrder.orderNumber}`,
            description: `POS Checkout - ${resultOrder.orderNumber}`,
            date: new Date(),
            lines: [
              { accountCode: accounts.debitCode, debit: resultOrder.total, credit: 0, description: `POS Receipt(${data.paymentMethod || 'CASH'})` },
              { accountCode: accounts.creditCode, debit: 0, credit: resultOrder.total, description: 'POS Sales Revenue' }
            ]
          }, tx);
        }
      }
    }
    return resultOrder;
  });
}

// Cash Register
export async function getCashRegisterReport(sessionId: string, tenantId: string) {
  return await client.pOSSession.findFirst({
    where: {
      id: sessionId,
      tenantId,
    },
    include: {
      orders: true,
    },
  }).then((session: any) => {
    if (!session) {
      return {
        sessionId,
        openingBalance: 0,
        sales: 0,
        returns: 0,
        expenses: 0,
        expectedBalance: 0,
        actualBalance: 0,
        difference: 0,
        orderCount: 0,
        avgOrderValue: 0,
      };
    }

    const openingBalance = session.openingCash;
    const sales = session.orders.reduce((acc: number, order: any) => acc + order.total, 0);
    const returns = 0;
    const expenses = 0;
    const expectedBalance = openingBalance + sales - returns - expenses;
    const actualBalance = session.closingCash || 0;
    const difference = actualBalance - expectedBalance;
    const orderCount = session.orders.length;
    const avgOrderValue = orderCount > 0 ? sales / orderCount : 0;

    return {
      sessionId,
      openingBalance,
      sales,
      returns,
      expenses,
      expectedBalance,
      actualBalance,
      difference,
      orderCount,
      avgOrderValue,
    };
  });
}

// POS Analytics
export async function getPOSAnalytics(tenantId: string, startDate: Date, endDate: Date) {
  return {
    totalSales: 0,
    orderCount: 0,
    avgOrderValue: 0,
    topProducts: [],
    hourlyBreakdown: [],
    paymentMethodBreakdown: [],
  };
}

// Receipt Generation
export async function generateReceipt(orderId: string, tenantId: string) {
  return {
    orderId,
    receiptNumber: `RCP - ${Date.now()}`,
    html: '<div>Receipt HTML</div>',
    printData: {},
  };
}
