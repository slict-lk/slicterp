import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { processUserMessage, ChatMessage } from '@/lib/ai/chat-agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/chat/[conversationId]
 * Get a specific conversation with all messages
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { conversationId } = await params;
        const { searchParams } = new URL(request.url);
        let tenantId = searchParams.get('tenantId');

        const sessionTenantId = (session as any)?.user?.tenantId;
        if (sessionTenantId) {
            tenantId = sessionTenantId;
        }

        if (!tenantId) {
            return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
        }

        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                tenantId,
                userId: session.user.id,
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        return NextResponse.json(conversation);
    } catch (error: any) {
        console.error('Error fetching conversation:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversation' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/ai/chat/[conversationId]
 * Send a new message in an existing conversation
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { conversationId } = await params;
        const body = await request.json();
        let { message, tenantId } = body;

        const sessionTenantId = (session as any)?.user?.tenantId;
        if (sessionTenantId) {
            tenantId = sessionTenantId;
        }

        if (!message || !tenantId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify conversation exists
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                tenantId,
                userId: session.user.id,
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Add user message
        await prisma.conversationMessage.create({
            data: {
                conversationId,
                role: 'USER',
                content: message,
                tenantId,
            },
        });

        // Build conversation history for AI
        const history: ChatMessage[] = conversation.messages.map((msg) => ({
            role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
            content: msg.content,
        }));

        // Process message with AI
        const aiResponse = await processUserMessage(message, history, tenantId);

        // Add AI response
        const aiMessage = await prisma.conversationMessage.create({
            data: {
                conversationId,
                role: 'ASSISTANT',
                content: aiResponse.response,
                functionCalls: aiResponse.functionCalls,
                tenantId,
            },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        return NextResponse.json({
            userMessage: {
                id: Date.now().toString(), // Temporary ID
                role: 'USER',
                content: message,
                createdAt: new Date(),
            },
            aiMessage,
        });
    } catch (error: any) {
        console.error('Error sending message:', error);
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/ai/chat/[conversationId]
 * Delete a conversation
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { conversationId } = await params;
        const { searchParams } = new URL(request.url);
        let tenantId = searchParams.get('tenantId');

        const sessionTenantId = (session as any)?.user?.tenantId;
        if (sessionTenantId) {
            tenantId = sessionTenantId;
        }

        if (!tenantId) {
            return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
        }

        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                tenantId,
                userId: session.user.id,
            },
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        await prisma.conversation.delete({
            where: {
                id: conversationId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting conversation:', error);
        return NextResponse.json(
            { error: 'Failed to delete conversation' },
            { status: 500 }
        );
    }
}
