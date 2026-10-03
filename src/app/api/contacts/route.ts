import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    const where: any = { tenantId };
    if (type) where.type = type;

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const stats = await prisma.contact.groupBy({
      by: ['type'],
      where: { tenantId },
      _count: true,
    });

    return NextResponse.json({
      contacts,
      stats: stats.reduce((acc: any, s: any) => ({ ...acc, [s.type]: s._count }), {}),
    });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const data = await req.json();

    const contact = await prisma.contact.create({
      data: {
        ...data,
        tenantId,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
