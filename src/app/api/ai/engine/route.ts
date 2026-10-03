import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { getLocalAIEngine } from '@/lib/ai/local-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/engine/status
 * Get the local AI engine status
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Require authentication for status endpoint
    const session = await getServerSession(authOptions);
    
    const engine = getLocalAIEngine();
    const status = engine.getStatus();
    const config = engine.getConfig();

    // Don't expose sensitive config to clients
    const safeConfig = {
      enabled: config.enabled,
      model: config.model,
      fallbackMode: config.fallbackMode,
    };

    return NextResponse.json({
      status,
      config: safeConfig,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching AI engine status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch engine status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/engine/initialize
 * Initialize the local AI engine
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

    const engine = getLocalAIEngine();
    const initialized = await engine.initialize();

    return NextResponse.json({
      success: initialized,
      status: engine.getStatus(),
      message: initialized
        ? 'AI Engine initialized successfully'
        : 'AI Engine initialized in fallback mode',
    });
  } catch (error: any) {
    console.error('Error initializing AI engine:', error);
    return NextResponse.json(
      { error: 'Failed to initialize AI engine' },
      { status: 500 }
    );
  }
}
