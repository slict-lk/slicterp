/**
 * POST /api/ai/groq/chat
 * Chat completion endpoint using Groq + Llama 3
 * Supports both streaming and non-streaming responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { getGroqEngine } from '@/lib/ai/groq-engine';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST request handler for chat completion
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      conversationId,
      message,
      tenantId,
      stream = true,
      model,
      temperature,
      maxTokens,
    } = body;

    // Validate required fields
    if (!message || !conversationId || !tenantId) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['message', 'conversationId', 'tenantId'],
        },
        { status: 400 }
      );
    }

    // Verify conversation ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: -20, // Last 20 messages for context
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot access this conversation' },
        { status: 403 }
      );
    }

    // Get tenant ID from user session
    const userTenantId = (session.user as any).tenantId || tenantId;

    // Save user message to database
    await prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content: message,
        tenantId: userTenantId,
      },
    });

    // Build message history for context
    const chatMessages = [
      {
        role: 'system' as const,
        content: `You are a helpful ERP assistant for business operations. 
You can help with:
- Generating invoices and sales documents
- Predicting sales trends and inventory needs
- Creating financial, HR, and sales reports
- Answering business questions

Be concise, professional, and provide actionable insights. For document generation requests, provide clear structured data.`,
      },
      ...conversation.messages.map((msg) => ({
        role: (msg.role === 'ASSISTANT' ? 'assistant' : msg.role === 'USER' ? 'user' : 'system') as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // Initialize Groq engine
    const engine = getGroqEngine();
    const engineStatus = engine.getStatus();

    if (!engineStatus.available) {
      // Try to initialize
      await engine.initialize();
      if (!engine.getStatus().available) {
        return NextResponse.json(
          {
            error: 'Groq AI engine is not available',
            details: engineStatus.error,
          },
          { status: 503 }
        );
      }
    }

    // Handle streaming response
    if (stream) {
      try {
        const streamResponse = engine.generateStreamingCompletion(
          chatMessages,
          {
            model: model || process.env.GROQ_MODEL,
            temperature: temperature ?? 0.7,
            maxTokens: maxTokens ?? 2000,
          }
        );

        // Transform stream to SSE format
        const encoder = new TextEncoder();
        const transformStream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const chunk of streamResponse) {
                if (chunk) {
                  const sseMessage = `data: ${JSON.stringify({ content: chunk, done: false })}\n\n`;
                  controller.enqueue(encoder.encode(sseMessage));
                }
              }
              
              // Send final message
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch (error) {
              console.error('Stream error:', error);
              controller.error(error);
            }
          },
        });

        // Store the response asynchronously (don't wait for it)
        storeAssistantMessage(conversationId, '', userTenantId);

        return new NextResponse(transformStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      } catch (error: any) {
        console.error('Streaming error:', error);
        return NextResponse.json(
          { error: 'Failed to stream response: ' + error.message },
          { status: 500 }
        );
      }
    }

    // Handle non-streaming response
    const completion = await engine.generateCompletion(chatMessages, {
      model: model || process.env.GROQ_MODEL,
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 2000,
    });

    // Save assistant message to database
    const assistantMessage = await prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: completion.response,
        tenantId: userTenantId,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      message: assistantMessage,
      tokens: completion.tokens,
      model: completion.model,
      engineStatus,
    });
  } catch (error: any) {
    console.error('Error in Groq chat endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to store assistant message asynchronously
 */
async function storeAssistantMessage(
  conversationId: string,
  content: string,
  tenantId: string
) {
  try {
    // This will be called after streaming starts
    // The full content should be accumulated on the client side
    await prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content,
        tenantId,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  } catch (error) {
    console.error('Error storing assistant message:', error);
  }
}
