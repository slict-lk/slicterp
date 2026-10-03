import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { recordInventoryOperationalEvent } from '@/lib/intelligence/events/inventory-operational-events';

export const dynamic = 'force-dynamic';

// GET /api/inventory/purchase-orders - Get all purchase orders
export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const searchParams = new URL(request.url).searchParams;
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId') || searchParams.get('vendorId');

    const purchaseOrders = await prisma.invPurchaseOrder.findMany({
      where: {
        tenantId: tenant.id,
        ...(status && { status }),
        ...(supplierId && { supplierId }),
      },
      include: {
        supplier: true,
        lines: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(purchaseOrders);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
  }
}

// POST /api/inventory/purchase-orders - Create new purchase order
export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    // 1. Validate items presence
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Purchase Order must have at least one item' }, { status: 400 });
    }

    // 2. Validate product IDs and quantities
    const productIds = body.items.map((item: any) => item.productId).filter(Boolean);
    if (productIds.length !== body.items.length) {
      return NextResponse.json({ error: 'All items must have a valid product ID' }, { status: 400 });
    }

    // 3. Batch check product existence
    const products = await prisma.invProduct.findMany({
      where: {
        id: { in: productIds },
        tenantId: tenant.id
      },
      select: { id: true }
    });

    if (products.length !== Array.from(new Set(productIds)).length) {
      return NextResponse.json({ error: 'One or more products were not found in the inventory' }, { status: 400 });
    }

    // 4. Validate quantities (must be finite and >= 0, though usually > 0 is preferred)
    for (const item of body.items) {
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty < 0) {
        return NextResponse.json({ error: `Invalid quantity for product ${item.productId}` }, { status: 400 });
      }
    }

    const supplierId = body.supplierId || body.vendorId;

    if (!supplierId) {
      return NextResponse.json({ error: 'supplierId is required' }, { status: 400 });
    }

    // Verify supplier exists within tenant
    const supplier = await prisma.vendor.findFirst({
      where: { id: supplierId, tenantId: tenant.id }
    });
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 400 });
    }

    const subtotal = !isNaN(Number(body.subtotal)) ? Number(body.subtotal) : 0;
    const tax = !isNaN(Number(body.tax)) ? Number(body.tax) : 0;
    const total = !isNaN(Number(body.total)) ? Number(body.total) : 0;

    const purchaseOrder = await prisma.invPurchaseOrder.create({
      data: {
        poNumber: body.poNumber || body.orderNumber || `PO-${Date.now()}`,
        status: body.status || 'DRAFT',
        supplierId: supplierId,
        expectedAt: (() => {
          const raw = body.expectedAt || body.expectedDate;
          if (!raw) return null;
          const d = new Date(raw);
          return !isNaN(d.getTime()) ? d : null;
        })(),
        subtotal,
        taxAmount: tax,
        total,
        notes: body.notes,
        tenantId: tenant.id,
        lines: {
          create: body.items.map((item: any) => {
            const qty = Number(item.quantity);
            const cost = Number(item.unitPrice ?? item.unitCost ?? 0);
            return {
              productId: item.productId,
              description: item.description || '',
              quantity: qty,
              unitCost: cost,
              lineTotal: qty * cost,
            };
          })
        }
      },
      include: {
        lines: true
      }
    });

    await recordInventoryOperationalEvent({
      tenantId: tenant.id,
      entityType: 'purchase_order',
      entityId: purchaseOrder.id,
      action: 'purchase_order.created',
      metadata: {
        poNumber: purchaseOrder.poNumber,
        supplierId,
        status: purchaseOrder.status,
        lineCount: purchaseOrder.lines.length,
        expectedAt: purchaseOrder.expectedAt,
        subtotal: subtotal,
        taxAmount: tax,
        total,
      },
    });

    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 });
  }
}

