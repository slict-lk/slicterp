import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { Prisma } from '@prisma/client';


export const dynamic = 'force-dynamic';
// GET /api/inventory/warehouses - Get all warehouses
export async function GET(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();

    const warehouses = await prisma.invWarehouse.findMany({
      where: {
        tenantId: tenant.id,
      },
      include: {
        stockMovements: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(warehouses);
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    return NextResponse.json({ error: 'Failed to fetch warehouses' }, { status: 500 });
  }
}

// POST /api/inventory/warehouses - Create new warehouse
export async function POST(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    if (!body.name || !body.code) {
      return NextResponse.json({ error: 'Warehouse name and code are required' }, { status: 400 });
    }

    const warehouse = await prisma.invWarehouse.create({
      data: {
        name: body.name,
        code: body.code,
        address: body.address,
        description: body.description || null,
        isActive: body.isActive !== false,
        tenantId: tenant.id,
      },
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error('Error creating warehouse:', error);
    return NextResponse.json({ error: 'Failed to create warehouse' }, { status: 500 });
  }
}

