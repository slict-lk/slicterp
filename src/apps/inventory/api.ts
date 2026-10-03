// Inventory & Operations API Functions
import { prisma } from '@/lib/prisma';
import type { Product, Warehouse, StockMove, PurchaseOrder } from './types';

const client = prisma as any;

export async function getProducts(tenantId: string) {
  return await prisma.product.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
}

export async function createProduct(data: Partial<Product> & { tenantId: string }) {
  return await prisma.product.create({
    data: {
      sku: data.sku!,
      name: data.name!,
      description: data.description,
      type: data.type || 'STORABLE',
      salePrice: (data as any).salePrice ?? (data as any).listPrice ?? 0,
      costPrice: data.costPrice ?? 0,
      stockQty: (data as any).stockQty ?? 0,
      minStockQty: (data as any).minStockQty ?? 0,
      barcode: data.barcode,
      isActive: data.isActive !== undefined ? data.isActive : true,
      images: (data as any).images || [],
      tenantId: data.tenantId,
    },
  });
}

export async function getWarehouses(tenantId: string) {
  return await prisma.warehouse.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
}

export async function getStockMoves(tenantId: string) {
  return await client.stockMove.findMany({
    where: { tenantId },
    include: {
      product: true,
      warehouse: true,
    },
    orderBy: { date: 'desc' },
  });
}

export async function getPurchaseOrders(tenantId: string) {
  return await client.purchaseOrder.findMany({
    where: { tenantId },
    orderBy: { orderDate: 'desc' },
  });
}
