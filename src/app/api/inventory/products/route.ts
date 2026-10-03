import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { Prisma } from '@prisma/client';


export const dynamic = 'force-dynamic';
// GET /api/inventory/products - Get all products
export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();

    // Check permissions
    const { requirePermission } = await import('@/lib/auth');
    await requirePermission('inventory', 'view');

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const typeParam = searchParams.get('type');
    const categoryId = searchParams.get('categoryId');
    const isActive = searchParams.get('isActive');

    const validTypes = ['STORABLE', 'CONSUMABLE', 'SERVICE'];
    if (typeParam && !validTypes.includes(typeParam)) {
      return NextResponse.json({ error: 'Invalid product type filtering' }, { status: 400 });
    }

    const parsedSkip = parseInt(searchParams.get('skip') || '0', 10);
    const parsedTake = parseInt(searchParams.get('take') || '50', 10);
    const skip = Math.max(0, isNaN(parsedSkip) ? 0 : parsedSkip);
    const take = Math.min(100, Math.max(1, isNaN(parsedTake) ? 50 : parsedTake));

    const whereClause: any = {
      tenantId: tenant.id,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(typeParam && { type: typeParam as 'STORABLE' | 'CONSUMABLE' | 'SERVICE' }),
      ...(categoryId && { categoryId: categoryId }),
      ...(isActive && { isActive: isActive === 'true' }),
    };

    const count = await prisma.invProduct.count({ where: whereClause });
    const products = await prisma.invProduct.findMany({
      where: whereClause,
      include: {
        category: true
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: products, count, skip, take });
  } catch (error: any) {
    if (error.message === 'Forbidden: Insufficient Permissions') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/inventory/products - Create new product
export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();

    // Check permissions
    const { requirePermission } = await import('@/lib/auth');
    await requirePermission('inventory', 'create');

    const body = await request.json();

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }
    if (!body.sku || typeof body.sku !== 'string' || body.sku.trim() === '') {
      return NextResponse.json({ error: 'Product SKU is required' }, { status: 400 });
    }

    const product = await prisma.invProduct.create({
      data: {
        sku: body.sku.trim(),
        name: body.name.trim(),
        description: body.description,
        type: (body.type as 'STORABLE' | 'CONSUMABLE' | 'SERVICE') || 'STORABLE',
        salePrice: body.salePrice ?? body.listPrice ?? 0,
        costPrice: body.costPrice ?? 0,
        stockQty: body.stockQty ?? body.qtyAvailable ?? 0,
        minStockQty: body.minStockQty ?? 0,
        barcode: body.barcode,
        categoryId: body.categoryId ?? body.category,
        isActive: body.isActive !== false,
        images: body.images || [],
        tenantId: tenant.id,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Forbidden: Insufficient Permissions') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

