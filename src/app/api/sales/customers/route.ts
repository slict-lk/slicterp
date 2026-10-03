import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, formatSuccessResponse, formatPaginatedResponse } from '@/lib/error-handler';
import { tryCatch } from '@/lib/error-handler';
import { requireTenantContext } from '@/lib/server/erp-context';
import { ensureDefaultBranch } from '@/lib/sales-crm/bootstrap';
import { ensurePartyForCustomerRecord } from '@/lib/sales-crm/party-sync';
import { z } from 'zod';


export const dynamic = 'force-dynamic';

const customerCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().nullable(),
  type: z.enum(['INDIVIDUAL', 'COMPANY']).optional(),
  street: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
}).passthrough();

const listQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  search: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  return tryCatch(async () => {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'view' });
    const { searchParams } = new URL(request.url);

    const validated = listQuerySchema.parse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      search: searchParams.get('search'),
      type: searchParams.get('type'),
    });

    const page = validated.page;
    const limit = validated.limit;
    const search = validated.search;
    const typeParam = validated.type;

    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { taxId: { contains: search } },
      ];
    }

    if (typeParam && typeParam !== 'ALL') {
      where.type = typeParam as 'INDIVIDUAL' | 'COMPANY';
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          leads: {
            select: {
              id: true,
              name: true,
              status: true,
              score: true,
            },
          },
          salesOrders: {
            select: {
              id: true,
              number: true,
              status: true,
              total: true,
            },
          },
          invoices: {
            select: {
              id: true,
              number: true,
              status: true,
              total: true,
            },
          },
          _count: {
            select: {
              leads: true,
              salesOrders: true,
              invoices: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json(
      formatPaginatedResponse(customers, page, limit, total)
    );
  }, 'Failed to fetch customers');
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext({ moduleId: 'sales', action: 'create' });
    const body = await request.json();
    const parsedData = customerCreateSchema.parse(body);

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        email: parsedData.email,
        tenantId,
      },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 409 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name: parsedData.name,
        email: parsedData.email,
        phone: parsedData.phone,
        type: parsedData.type || 'INDIVIDUAL',
        address: parsedData.street ?? parsedData.address,
        city: parsedData.city,
        state: parsedData.state,
        zipCode: parsedData.zipCode,
        country: parsedData.country || 'US',
        tenantId,
      },
      include: {
        leads: true,
        salesOrders: true,
        invoices: true,
        _count: {
          select: {
            leads: true,
            salesOrders: true,
            invoices: true,
          },
        },
      },
    });

    // Best-effort dual-write to Party/CustomerAccount foundation
    try {
      const branch = await ensureDefaultBranch(tenantId);
      await ensurePartyForCustomerRecord({
        tenantId,
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        type: customer.type,
        address: {
          line1: customer.address,
          city: customer.city,
          state: customer.state,
          postalCode: customer.zipCode,
          country: customer.country,
        },
        branchId: branch.id,
      });
    } catch (syncError) {
      console.error('Customer party sync failed (non-blocking):', syncError);
    }

    return NextResponse.json(
      formatSuccessResponse(customer, 'Customer created successfully'),
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Failed to create customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
