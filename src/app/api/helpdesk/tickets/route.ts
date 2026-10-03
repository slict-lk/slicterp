import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assigneeId');

    const where: any = { tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        customer: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const stats = await prisma.ticket.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });

    return NextResponse.json({
      tickets,
      stats: stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
    });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const data = await req.json();

    // Generate ticket number
    const count = await prisma.ticket.count({ where: { tenantId } });
    const number = `TKT-${String(count + 1).padStart(6, '0')}`;

    const ticket = await prisma.ticket.create({
      data: {
        ...data,
        number,
        tenantId,
      },
      include: {
        customer: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
    }

    const data = await req.json();
    const ticket = await prisma.ticket.update({
      where: { id },
      data,
      include: {
        customer: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(ticket);
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
