import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { id } = await params;

    const session = await prisma.liveChatSession.findFirst({
      where: { id, tenantId },
      include: {
        assignedTo: {
          select: { name: true, email: true },
        },
        messages: {
          orderBy: { sentAt: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Live chat session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error: any) {
    console.error('Error fetching live chat session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { id } = await params;
    const data = await req.json();

    // If closing the session, set endedAt
    if (data.status === 'CLOSED' || data.status === 'RESOLVED') {
      data.endedAt = new Date();
    }

    const session = await prisma.liveChatSession.update({
      where: { id },
      data,
      include: {
        assignedTo: {
          select: { name: true, email: true },
        },
        messages: true,
      },
    });

    return NextResponse.json(session);
  } catch (error: any) {
    console.error('Error updating live chat session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { id } = await params;

    await prisma.liveChatSession.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Session deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting live chat session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
