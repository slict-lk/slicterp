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

    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: tenant.id,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { taxId: { contains: search } },
      ];
    }

    const [vendors, total] = await Promise.all([
      (prisma as any).vendor.findMany({
        where,
        include: {
          purchaseOrders: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
            },
          },
          _count: {
            select: {
              purchaseOrders: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).vendor.count({ where }),
    ]);

    return NextResponse.json(
      formatPaginatedResponse(vendors, page, limit, total)
    );
  }, 'Failed to fetch vendors');
}

export async function POST(request: NextRequest) {
  return tryCatch(async () => {
    const tenant = await getOrCreateDefaultTenant();
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if vendor with this email already exists
    if (body.email) {
      const existingVendor = await (prisma as any).vendor.findFirst({
        where: {
          email: body.email,
          tenantId: tenant.id,
        },
      });

      if (existingVendor) {
        return NextResponse.json(
          { error: 'Vendor with this email already exists' },
          { status: 409 }
        );
      }
    }

    const vendor = await (prisma as any).vendor.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        website: body.website,
        taxId: body.taxId,
        paymentTerms: body.paymentTerms,
        creditLimit: body.creditLimit ? parseFloat(body.creditLimit) : null,
        address: body.address || body.street, // Frontend might send street or address
        city: body.city,
        state: body.state,
        postalCode: body.postalCode || body.zipCode, // Handle alias
        zipCode: body.zipCode, // Keep zipCode too if schema has it, wait schema has zipCode as optional.
        country: body.country || 'US',

        contactPerson: body.contactPerson,
        contactPhone: body.contactPhone,
        contactEmail: body.contactEmail,

        notes: body.notes,
        tenantId: tenant.id,
      },
      include: {
        purchaseOrders: true,
        _count: {
          select: {
            purchaseOrders: true,
          },
        },
      },
    });

    return NextResponse.json(
      formatSuccessResponse(vendor, 'Vendor created successfully'),
      { status: 201 }
    );
  }, 'Failed to create vendor');
}

