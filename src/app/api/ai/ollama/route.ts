/**
 * Ollama AI API Endpoint
 * POST /api/ai/ollama - Generate text using local Ollama models
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOllamaClient } from '@/lib/ollama';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateRequest {
  prompt: string;
  model?: string;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
}

interface GenerateResponse {
  response: string;
  model: string;
  success: boolean;
}

/**
 * GET /api/ai/ollama
 * Check Ollama health and get available models
 */
export async function GET(request: NextRequest) {
  try {
    const client = getOllamaClient();

    // Check if Ollama is healthy
    const isHealthy = await client.isHealthy();

    if (!isHealthy) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          message: 'Ollama server is not running',
          instructions: 'Start Ollama with: ollama serve',
        },
        { status: 503 }
      );
    }

    // Get available models
    const models = await client.getModels();

    return NextResponse.json({
      status: 'healthy',
      message: 'Ollama is running',
      models: models.map(m => ({
        name: m.name,
        size: m.size,
        modified: m.modified_at,
      })),
      modelCount: models.length,
    });
  } catch (error: any) {
    console.error('Error checking Ollama health:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Failed to check Ollama status',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/ollama
 * Generate text using Ollama
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { prompt, model, stream, temperature, top_p, top_k, max_tokens } = body;

    // Validate required fields
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const client = getOllamaClient();

    // Check if Ollama is running
    const isHealthy = await client.isHealthy();
    if (!isHealthy) {
      return NextResponse.json(
        {
          error: 'Ollama is not running',
          instructions: 'Start Ollama with: ollama serve',
        },
        { status: 503 }
      );
    }

    // Check if streaming is requested
    if (stream) {
      return handleStreamingResponse(client, prompt, model, {
        temperature,
        top_p,
        top_k,
        num_predict: max_tokens,
      });
    }

    // Generate response
    const response = await client.generate(prompt, model, {
      temperature,
      top_p,
      top_k,
      num_predict: max_tokens,
    });

    const result: GenerateResponse = {
      response,
      model: model || 'default',
      success: true,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error generating text:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate text',
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle streaming response
 */
async function handleStreamingResponse(
  client: any,
  prompt: string,
  model: string | undefined,
  options: any
) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = client.generateStream(prompt, model, options);

        for await (const chunk of generator) {
          const data = {
            type: 'text',
            content: chunk,
          };
          controller.enqueue(JSON.stringify(data) + '\n');
        }

        controller.enqueue(JSON.stringify({ type: 'done' }) + '\n');
      } catch (error: any) {
        controller.enqueue(
          JSON.stringify({
            type: 'error',
            message: error.message,
          }) + '\n'
        );
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    },
  });
}

/**
 * DELETE /api/ai/ollama
 * Remove a model
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelName = searchParams.get('model');

    if (!modelName) {
      return NextResponse.json(
        { error: 'Model name is required' },
        { status: 400 }
      );
    }

    const client = getOllamaClient();

    // Note: Ollama doesn't have a DELETE endpoint yet
    // This is a placeholder for future functionality

    return NextResponse.json({
      message: `Delete functionality for model ${modelName} coming soon`,
    });
  } catch (error: any) {
    console.error('Error deleting model:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to delete model',
      },
      { status: 500 }
    );
  }
}
