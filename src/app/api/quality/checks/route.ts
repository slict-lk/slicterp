import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';

    const client = prisma as any;

    const checks = await client.qualityCheck.findMany({
      where: { tenantId },
      include: {
        product: { select: { name: true, sku: true } },
        inspector: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const stats = await client.qualityCheck.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });

    return NextResponse.json({
      checks,
      stats: stats.reduce((acc: any, s: any) => ({ ...acc, [s.status]: s._count }), {}),
    });
  } catch (error: any) {
    console.error('Error fetching quality checks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const data = await req.json();

    const client = prisma as any;

    const check = await client.qualityCheck.create({
      data: {
        ...data,
        tenantId,
      },
      include: {
        product: { select: { name: true, sku: true } },
        inspector: { select: { name: true } },
      },
    });

    return NextResponse.json(check, { status: 201 });
  } catch (error: any) {
    console.error('Error creating quality check:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

