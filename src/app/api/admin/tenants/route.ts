import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/tenants - Super Admin tenant directory
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Tenant is the tenancy root - it has no tenantId of its own, so this
    // listing is scoped by the caller's super-admin role, never by a header.
    const where: any = {};
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const results = await prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(results);
  } catch (error) {
    console.error('Admin tenants list error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/admin/tenants - Super Admin tenant provisioning
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    const data = await req.json();
    const { name, subdomain, plan, status } = data;

    if (!name || !subdomain) {
      return NextResponse.json({ error: 'name and subdomain are required' }, { status: 400 });
    }

    // Explicit field list - spreading the request body let a caller set any
    // column on the tenancy root, including ones the UI never exposes.
    const result = await prisma.tenant.create({
      data: { name, subdomain, ...(plan && { plan }), ...(status && { status }) },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Admin tenant create error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
