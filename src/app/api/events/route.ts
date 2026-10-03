import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';

    const events = await prisma.marketingEvent.findMany({
      where: { tenantId },
      include: {
        _count: { select: { registrations: true } },
      },
      orderBy: { startDate: 'desc' },
      take: 50,
    });

    return NextResponse.json(events);
  } catch (error: any) {
    console.error('Error fetching marketing events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const data = await req.json();

    const event = await prisma.marketingEvent.create({
      data: {
        ...data,
        tenantId,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error('Error creating marketing event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
