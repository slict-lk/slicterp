import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { formatSuccessResponse, formatPaginatedResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    const tenant = await getOrCreateDefaultTenant();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: tenant.id,
    };

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const client = prisma as any;

    const [purchaseOrders, total] = await Promise.all([
      client.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      client.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json(
      formatPaginatedResponse(purchaseOrders, page, limit, total)
    );
  }, 'Failed to fetch purchase orders');
}

export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    // Validate required fields
    if (!body.supplierId || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Supplier and at least one item are required' },
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = body.items.reduce(
      (sum: number, item: any) => sum + (item.quantity * item.unitPrice),
      0
    );
    const totalTax = body.items.reduce(
      (sum: number, item: any) => sum + ((item.quantity * item.unitPrice) * (item.tax || 0) / 100),
      0
    );
    const total = subtotal + totalTax;

    const client = prisma as any;

    const purchaseOrder = await client.purchaseOrder.create({
      data: {
        orderNumber: body.orderNumber || `PO${Date.now()}`,
        supplier: body.supplierId || body.supplier,
        orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        status: body.status || 'DRAFT',
        subtotal,
        tax: totalTax,
        total,
        tenantId: tenant.id,
      },
    });

    return NextResponse.json(
      formatSuccessResponse(purchaseOrder, 'Purchase order created successfully'),
      { status: 201 }
    );
  }, 'Failed to create purchase order');
}

