import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { recordInventoryOperationalEvent } from '@/lib/intelligence/events/inventory-operational-events';


export const dynamic = 'force-dynamic';
// GET /api/inventory/stock - Get all stock movements
export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const warehouseId = searchParams.get('warehouseId');
    const type = searchParams.get('type');

    const stockMovements = await prisma.invStockMovement.findMany({
      where: {
        tenantId: tenant.id,
        ...(productId && { productId }),
        ...(warehouseId && { warehouseId }),
        ...(type && { type }),
      },
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(stockMovements);
  } catch (error) {
    console.error('Error fetching stock moves:', error);
    return NextResponse.json({ error: 'Failed to fetch stock moves' }, { status: 500 });
  }
}

import { recordStockIn, recordStockOut, checkStockAvailability } from '@/lib/inventory/inventory-bridge';

// POST /api/inventory/stock - Create new stock movement
export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    const validTypes = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'WRITE_OFF'] as const;
    const type = body.type as typeof validTypes[number];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid movement type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    if (!body.productId || !body.warehouseId) {
      return NextResponse.json({ error: 'productId and warehouseId are required' }, { status: 400 });
    }

    let quantity = Number(body.quantity);
    let direction = body.direction !== undefined ? Number(body.direction) : 1;

    if (!Number.isFinite(quantity) || (body.direction !== undefined && !Number.isFinite(direction))) {
      return NextResponse.json({ error: 'Quantity and direction must be valid finite numbers' }, { status: 400 });
    }

    if (quantity < 0) {
      if (body.direction !== undefined) {
        return NextResponse.json({ error: 'Cannot push negative quantity alongside explicit direction parameters' }, { status: 400 });
      }
      quantity = Math.abs(quantity);
      direction = -1;
    }

    // Check stock if doing an OUT bound movement or negative adjustment
    if (type === 'OUT' || type === 'WRITE_OFF' || (type === 'ADJUSTMENT' && direction === -1)) {
      const check = await checkStockAvailability(tenant.id, body.productId, body.warehouseId, quantity);
      if (!check.available) {
        return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
      }
    }

    const params = {
      tenantId: tenant.id,
      productId: body.productId,
      warehouseId: body.warehouseId,
      quantity,
      unitCost: (() => { const uc = Number(body.unitCost ?? 0); return Number.isFinite(uc) ? uc : 0; })(),
      sourceModule: 'inventory',
      sourceDocument: body.sourceDocument || 'manual',
      reference: body.reference || `STK-${Date.now()}`,
      notes: body.notes,
      date: body.date ? new Date(body.date) : new Date(),
    };

    let result;
    if (type === 'IN' || type === 'RETURN' || (type === 'ADJUSTMENT' && direction === 1)) {
      // if adjustment, we need the direction. 
      result = await recordStockIn(type, params);
    } else {
      result = await recordStockOut(type, params);
    }

    await recordInventoryOperationalEvent({
      tenantId: tenant.id,
      entityType: 'stock_movement',
      entityId: result.movement?.id ?? params.reference,
      action: 'stock.movement_recorded',
      metadata: {
        productId: body.productId,
        warehouseId: body.warehouseId,
        movementType: type,
        direction,
        quantity,
        reference: params.reference,
        sourceDocument: params.sourceDocument,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating stock move:', error);
    return NextResponse.json({ error: 'Failed to create stock move' }, { status: 500 });
  }
}

