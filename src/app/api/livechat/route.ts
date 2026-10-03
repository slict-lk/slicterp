import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = { tenantId };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const sessions = await prisma.liveChatSession.findMany({
      where,
      include: {
        assignedTo: {
          select: { name: true, email: true },
        },
        messages: {
          orderBy: { sentAt: 'asc' },
          take: 10, // Latest 10 messages
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(sessions);
  } catch (error: any) {
    console.error('Error fetching live chat sessions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const data = await req.json();

    const session = await prisma.liveChatSession.create({
      data: {
        ...data,
        tenantId,
        status: 'ACTIVE',
        startedAt: new Date(),
      },
      include: {
        assignedTo: {
          select: { name: true, email: true },
        },
        messages: true,
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error: any) {
    console.error('Error creating live chat session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
