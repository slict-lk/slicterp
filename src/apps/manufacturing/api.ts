// Manufacturing (MRP) Module API Functions
import { prisma } from '@/lib/prisma';
import type { BillOfMaterials, ManufacturingOrder, WorkCenter } from './types';

const client = prisma as any;

// Bill of Materials
export async function getBOMs(tenantId: string) {
  return await client.billOfMaterials.findMany({
    where: { tenantId },
    include: {
      product: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createBOM(data: Partial<BillOfMaterials> & { tenantId: string }) {
  if (!data.code || !data.productId) {
    throw new Error('Code and productId are required to create a BOM');
  }
  return await client.billOfMaterials.create({
    data: {
      code: data.code,
      productId: data.productId,
      quantity: data.quantity ?? 1,
      type: data.type || 'MANUFACTURE',
      tenantId: data.tenantId,
    },
    include: {
      product: true,
    },
  });
}

export async function getBOMById(id: string, tenantId: string) {
  return await client.billOfMaterials.findFirst({
    where: { id, tenantId },
    include: {
      product: true,
    },
  });
}

// Work Centers
export async function getWorkCenters(tenantId: string) {
  return await client.workCenter.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
}

export async function createWorkCenter(data: Partial<WorkCenter> & { tenantId: string }) {
  if (!data.name || !data.name.trim() || !data.code || !data.code.trim()) {
    throw new Error('Name and code are required to create a Work Center');
  }
  const capacity = data.capacity ?? 1;
  const efficiency = data.efficiency ?? 100;

  return await client.workCenter.create({
    data: {
      tenantId: data.tenantId,
      name: data.name!,
      code: data.code!,
      capacity,
      efficiency,
    }
  });
}

// Manufacturing Orders
export async function getManufacturingOrders(tenantId: string, status?: string) {
  return await client.manufacturingOrder.findMany({
    where: {
      tenantId,
      ...(status && { status }),
    },
    include: {
      product: true,
      bom: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createManufacturingOrder(data: Partial<ManufacturingOrder> & { tenantId: string }) {
  return await client.manufacturingOrder.create({
    data: {
      reference: data.reference || `MO-${Date.now()}`,
      productId: data.productId!,
      quantity: data.quantity ?? 1,
      bomId: data.bomId,
      status: 'DRAFT',
      startDate: data.startDate || new Date(),
      tenantId: data.tenantId,
    },
    include: {
      product: true,
      bom: true,
    },
  });
}

export async function updateManufacturingOrder(
  id: string,
  data: Partial<ManufacturingOrder>,
  tenantId: string
) {
  const order = await client.manufacturingOrder.findFirst({
    where: { id, tenantId },
    include: { bom: { include: { components: true } }, product: true }
  });

  if (!order) throw new Error('Manufacturing order not found');

  if (data.status !== undefined) {
    await client.manufacturingOrder.update({
      where: { id },
      data: {
        status: data.status,
        endDate: data.status === 'DONE' ? new Date() : undefined
      }
    });
  }

  // Refetch to reflect exact latest DB state 
  const updatedOrder = await client.manufacturingOrder.findUnique({
    where: { id },
    include: { bom: { include: { components: true } }, product: true }
  });

  if (!updatedOrder) {
    throw new Error(`Manufacturing order ${id} not found after update`);
  }

  // --- INTEGRATE WITH MASTER INVENTORY MODULE ---
  if (data.status === 'DONE' && order.status !== 'DONE') {
    const { recordStockIn, recordStockOut } = await import('@/lib/inventory/inventory-bridge');

    const defaultWarehouse = await client.invWarehouse.findFirst({ where: { tenantId, isDefault: true } })
      || await client.invWarehouse.findFirst({ where: { tenantId } });

    if (defaultWarehouse) {
      let rawCostTotal = Number(order.product?.costPrice ?? 0);

      if (order.bom) {
        const components = (order.bom as any).components;
        if (Array.isArray(components) && components.length > 0) {
          rawCostTotal = components.reduce((sum: number, comp: any) => {
            return sum + ((comp.unitCost ?? 0) * (comp.quantity ?? 0));
          }, 0);
        }
      }

      // 1. Consume BOM components from inventory
      if (order.bom) {
        const components = (order.bom as any).components;
        if (Array.isArray(components) && components.length > 0) {
          const consumeErrors: string[] = [];
          for (const comp of components) {
            try {
              await recordStockOut('OUT', {
                tenantId,
                productId: comp.productId,
                productName: comp.productName || `BOM Component ${comp.productId}`,
                productCategory: 'Raw Materials',
                productPrice: Number(comp.unitCost ?? 0),
                warehouseId: defaultWarehouse.id,
                quantity: Number(comp.quantity ?? 0) * Number(order.quantity),
                unitCost: Number(comp.unitCost ?? 0),
                sourceModule: 'manufacturing',
                sourceDocument: order.id,
                reference: `MO-CONSUME-${order.reference || order.id.substring(0, 6)}`,
              });
            } catch (e: any) {
              consumeErrors.push(`Component ${comp.productId}: ${e.message || 'unknown error'}`);
            }
          }
          if (consumeErrors.length > 0) {
            throw new Error(`Failed to consume BOM components: ${consumeErrors.join('; ')}`);
          }
        }
      }

      // 2. Add finished goods to inventory
      await recordStockIn('IN', {
        tenantId,
        productId: order.productId,
        productName: order.product?.name || `Manufactured Product ${order.productId}`,
        productCategory: 'Manufactured Goods',
        warehouseId: defaultWarehouse.id,
        quantity: Number(order.quantity),
        unitCost: rawCostTotal, // the cost of production
        sourceModule: 'manufacturing',
        sourceDocument: order.id,
        reference: `MO-${order.reference || order.id.substring(0, 6)}`
      }); // Propagate errors upwards
    }
  }

  return updatedOrder;
}

// Production Analytics
export async function getProductionStats(tenantId: string) {
  return {
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    efficiency: 0,
    utilization: 0,
  };
}

export async function calculateMaterialRequirements(bomId: string, quantity: number) {
  // MRP calculation logic
  return {
    bomId,
    quantity,
    materials: [],
    operations: [],
    estimatedCost: 0,
    estimatedTime: 0,
  };
}
