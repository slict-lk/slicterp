/**
 * AI Engine Initialization Middleware
 * Auto-initializes the local AI engine when the app starts
 */

import { getLocalAIEngine } from '@/lib/ai/local-engine';

let initialized = false;

/**
 * Initialize the AI engine (called on app startup)
 */
export async function initializeAIEngine() {
  if (initialized) {
    return;
  }

  try {
    if (process.env.GROQ_API_KEY) {
      console.log('🚀 Groq AI Engine Configured & Ready');
      initialized = true;
      return;
    }

    const engine = getLocalAIEngine();
    console.log('🤖 Initializing Local AI Engine...');

    const success = await engine.initialize();

    if (success) {
      console.log('✅ Local AI Engine initialized successfully');
      const status = engine.getStatus();
      console.log(`   Model: ${status.model}`);
      console.log(`   Connected: ${status.connected}`);
      console.log(`   Model Loaded: ${status.modelLoaded}`);

      // Start periodic health checks
      engine.startHealthChecks(60000); // Check every minute
    } else {
      console.log('⚠️  Local AI Engine initialized in fallback mode');
      console.log('   The app will use offline/fallback responses (no fabricated mock data)');
      console.log('   To enable Ollama:');
      console.log('   1. Install Ollama from https://ollama.ai');
      console.log('   2. Run: ollama serve');
      console.log('   3. Pull a model: ollama pull llama2');
      console.log('   4. Restart the app');
    }

    initialized = true;
  } catch (error) {
    console.error('❌ Error initializing AI Engine:', error);
    // Continue anyway - fallback mode will handle it
    initialized = true;
  }
}

/**
 * Get initialization status
 */
export function isAIEngineInitialized(): boolean {
  return initialized;
}

/**
 * Reinitialize the AI engine (useful for testing)
 */
export async function reinitializeAIEngine() {
  initialized = false;
  return initializeAIEngine();
}
