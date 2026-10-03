import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getLocalAIEngine } from '@/lib/ai/local-engine';
import { getGroqEngine } from '@/lib/ai/groq-engine';
import { generateGeminiCompletion } from '@/lib/ai/google-engine';
import { recordModelUsage } from '@/lib/ai/control-plane';
import { AGENT_FUNCTIONS, executeAgentFunction, processUserMessage } from '@/lib/ai/chat-agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/chat/complete
 * Send a message to the AI engine (Groq first, fallback to local Ollama)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { conversationId, message } = body;
    const sessionTenantId = (session.user as any).tenantId as string | undefined;

    if (!sessionTenantId) {
      return NextResponse.json(
        { error: 'Forbidden: no tenant in session' },
        { status: 403 }
      );
    }

    const tenantId = sessionTenantId;

    if (!message || !conversationId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, conversationId' },
        { status: 400 }
      );
    }

    // Get conversation to verify ownership and get context
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: -10, // Last 10 messages for context
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
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const targetModelId = conversation.modelId || body.modelId;

    const configuredModel = targetModelId
      ? await prisma.languageModel.findFirst({
          where: { tenantId, id: targetModelId, isActive: true },
          select: {
            id: true,
            provider: true,
            modelId: true,
            apiKey: true,
            apiEndpoint: true,
          },
        })
      : await prisma.languageModel.findFirst({
          where: { tenantId, isActive: true },
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
          select: {
            id: true,
            provider: true,
            modelId: true,
            apiKey: true,
            apiEndpoint: true,
          },
        });

    // Build message history for context
    const chatMessages = [
      {
        role: 'system' as const,
        content: `You are a helpful business assistant for ${tenantId}. Help with sales, inventory, customers, and other business operations.`,
      },
      ...conversation.messages.map((msg) => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // Process message using the centralized agent logic (handles Gemini, Groq, and Ollama with tool calling)
    const { response: completionResponse, functionCalls } = await processUserMessage(
      message,
      conversation.messages.map(msg => ({
        role: msg.role.toLowerCase() as any,
        content: msg.content
      })),
      tenantId,
      session.user.id,
      3, // max iterations
      targetModelId
    );

    const mainFunctionCall = functionCalls && functionCalls.length > 0 ? functionCalls[0] : null;
    const functionResult = mainFunctionCall ? mainFunctionCall.result : null;

    // Save assistant message to database
    const assistantMessage = await prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: completionResponse,
        functionCalls: functionCalls ? functionCalls as any : undefined,
        tenantId,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    try {
      await recordModelUsage({
        tenantId,
        modelId: configuredModel?.id || null,
        provider: configuredModel?.provider || 'OLLAMA',
        providerModelId: configuredModel?.modelId || 'local',
        conversationId,
        userId: session.user.id,
        operation: 'chat_completion',
        totalTokens: Math.ceil((message.length + completionResponse.length) / 4), // Simple fallback estimate
        success: true,
      });
    } catch (usageError) {
      console.error('Failed to record model usage:', usageError);
    }

    return NextResponse.json({
      message: assistantMessage,
      functionCall: mainFunctionCall,
      functionResult,
      engineStatus: {
        engine: configuredModel?.provider?.toLowerCase() || 'ollama',
        available: true,
      },
    });
  } catch (error: any) {
    console.error('Error in chat completion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate completion', 
        details: error.message || error.toString() 
      },
      { status: 500 }
    );
  }
}
