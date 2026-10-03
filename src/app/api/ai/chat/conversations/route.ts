import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { processUserMessage } from '@/lib/ai/chat-agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/chat/conversations
 * Get all conversations for the authenticated user
 */
export async function GET(request: NextRequest) {
    try {
        // Get authenticated session
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        let tenantId = searchParams.get('tenantId');

        // Use session tenantId if available to ensure we fetch the correct records
        // even if the client sends a placeholder like 'tenant-1'
        const sessionTenantId = (session as any)?.user?.tenantId;
        if (sessionTenantId) {
            tenantId = sessionTenantId;
        }

        if (!tenantId) {
            return NextResponse.json(
                { error: 'Missing tenantId' },
                { status: 400 }
            );
        }

        const conversations = await prisma.conversation.findMany({
            where: {
                userId: session.user.id,
                tenantId,
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                    take: 1, // Just get the first message for preview
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return NextResponse.json(conversations);
    } catch (error: any) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversations' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/ai/chat/conversations
 * Create a new conversation
 */
export async function POST(request: NextRequest) {
    try {
        // Get authenticated session
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        let { tenantId, message, modelId } = body as { tenantId?: string; message?: string; modelId?: string };

        // Prefer tenantId from the authenticated session if available
        // This prevents clients from spoofing tenantId and causing foreign key errors.
        const sessionTenantId = (session as any)?.user?.tenantId;
        if (!tenantId && sessionTenantId) {
            tenantId = sessionTenantId;
        }

        if (!tenantId || !message) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user) {
            console.error('Authenticated session has no corresponding user record', { session });
            return NextResponse.json(
                { error: 'User not found' },
                { status: 403 }
            );
        }

        // If the request tenant differs from the authenticated user's tenant, automatically
        // override the requested tenant with the user's tenant to prevent spoofing and FK errors.
        if (user.tenantId !== tenantId) {
            console.warn('Overriding requested tenantId with authenticated user tenantId', {
                userId: user.id,
                userTenant: user.tenantId,
                requestedTenant: tenantId,
                sessionTenantId,
                sessionUser: session.user,
            });

            // Use the authoritative tenant from the user record
            tenantId = user.tenantId;
        }

        // Create new conversation
        const conversation = await prisma.conversation.create({
            data: {
                userId: session.user.id,
                tenantId,
                modelId: modelId || null,
                title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
                messages: {
                    create: [
                        {
                            role: 'USER',
                            content: message,
                            tenantId,
                        },
                    ],
                },
            },
            include: {
                messages: true,
            },
        });

        // Process the message with AI
        const aiResponse = await processUserMessage(message, [], tenantId, session.user.id, 3, modelId || undefined);

        // Add AI response to conversation
        await prisma.conversationMessage.create({
            data: {
                conversationId: conversation.id,
                role: 'ASSISTANT',
                content: aiResponse.response,
                functionCalls: aiResponse.functionCalls,
                tenantId,
            },
        });

        // Fetch updated conversation
        const updatedConversation = await prisma.conversation.findUnique({
            where: { id: conversation.id },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        });

        return NextResponse.json(updatedConversation);
    } catch (error: any) {
        console.error('Error creating conversation:', error);
        return NextResponse.json(
            { error: 'Failed to create conversation' },
            { status: 500 }
        );
    }
}
