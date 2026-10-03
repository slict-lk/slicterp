import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { id: sessionId } = await params;
    const data = await req.json();

    // Verify session exists and belongs to tenant
    const session = await prisma.liveChatSession.findFirst({
      where: { id: sessionId, tenantId },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Live chat session not found' },
        { status: 404 }
      );
    }

    const message = await prisma.liveChatMessage.create({
      data: {
        sessionId,
        content: data.content,
        senderType: data.senderType,
        senderId: data.senderId,
        senderName: data.senderName,
        tenantId,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    console.error('Error creating live chat message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { id: sessionId } = await params;

    const messages = await prisma.liveChatMessage.findMany({
      where: { sessionId, tenantId },
      orderBy: { sentAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error('Error fetching live chat messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const { id: sessionId } = await params;
    const { messageIds, isRead } = await req.json();

    // Mark multiple messages as read/unread
    await prisma.liveChatMessage.updateMany({
      where: {
        id: { in: messageIds },
        sessionId,
        tenantId,
      },
      data: { isRead },
    });

    return NextResponse.json({ message: 'Messages updated successfully' });
  } catch (error: any) {
    console.error('Error updating live chat messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
