/**
 * GET /api/ai/groq/status
 * POST /api/ai/groq/initialize
 * Check Groq engine status and initialize if needed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { getGroqEngine } from '@/lib/ai/groq-engine';
import { getGroqClient } from '@/lib/ai/groq-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET handler - Check Groq engine status and available models
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const engine = getGroqEngine();
    const status = engine.getStatus();
    const config = engine.getConfig();

    // Try to get available models
    const client = getGroqClient();
    let availableModels: string[] = [];

    try {
      availableModels = await client.getAvailableModels();
    } catch (error) {
      console.warn('Could not fetch available models:', error);
      availableModels = [config.model];
    }

    return NextResponse.json({
      status,
      config: {
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        timeout: config.timeout,
      },
      availableModels,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching Groq status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Initialize Groq engine
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

    const body = await request.json().catch(() => ({}));

    const engine = getGroqEngine();
    const initialized = await engine.initialize();

    const status = engine.getStatus();

    return NextResponse.json({
      success: initialized,
      status,
      message: initialized
        ? 'Groq engine initialized successfully'
        : 'Groq engine failed to initialize - check GROQ_API_KEY',
    });
  } catch (error: any) {
    console.error('Error initializing Groq engine:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize Groq engine',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
